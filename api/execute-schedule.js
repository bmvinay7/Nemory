/**
 * Manual Schedule Execution API
 * Allows manual triggering of specific schedules
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, addDoc, collection, Timestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

/**
 * Execute a single schedule (simplified version for manual execution)
 */
async function executeSchedule(schedule) {
  console.log(`🚀 Manual execution of schedule: ${schedule.name} (${schedule.id})`);

  const executionId = `exec_${Date.now()}_manual`;
  
  const execution = {
    id: executionId,
    scheduleId: schedule.id,
    userId: schedule.userId,
    executedAt: Timestamp.now(),
    status: 'running',
    contentProcessed: 0,
    deliveryResults: {},
    isManual: true
  };

  try {
    // Get user's Notion access token
    const userDoc = await getDoc(doc(db, 'users', schedule.userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const notionAccessToken = userData.notionAccessToken;
    
    if (!notionAccessToken) {
      throw new Error('Notion access token not found');
    }

    // Generate AI summary
    const summaryResult = await generateAISummary(schedule, notionAccessToken);
    execution.contentProcessed = summaryResult.contentCount;

    // Deliver via configured channels
    let deliverySuccess = false;

    // Telegram delivery
    if (schedule.deliveryMethods?.telegram?.enabled && schedule.deliveryMethods.telegram.chatId) {
      try {
        await sendTelegramMessage(schedule.deliveryMethods.telegram.chatId, summaryResult.summary);
        execution.deliveryResults.telegram = { status: 'success', timestamp: new Date().toISOString() };
        deliverySuccess = true;
      } catch (telegramError) {
        execution.deliveryResults.telegram = { 
          status: 'failed', 
          error: telegramError.message,
          timestamp: new Date().toISOString()
        };
      }
    }

    execution.status = deliverySuccess ? 'success' : 'failed';
    
  } catch (error) {
    console.error('❌ Manual execution failed:', error);
    execution.status = 'failed';
    execution.error = error.message;
  }

  // Log execution to Firestore
  try {
    await addDoc(collection(db, 'schedule_executions'), execution);
    console.log(`📝 Manual execution logged for schedule ${schedule.id} with status: ${execution.status}`);
  } catch (logError) {
    console.error('Failed to log execution:', logError);
  }

  return execution;
}

/**
 * Generate AI summary using Notion content (Enhanced version)
 */
async function generateAISummary(schedule, notionAccessToken) {
  console.log(`🔍 Starting manual content search for schedule: ${schedule.name}`);
  
  // Use the same enhanced logic as cron job
  const contentDays = schedule.summaryConfig?.contentDays || 14;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - contentDays);
  
  console.log(`📅 Searching for content from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Get all pages first
  const allPagesResponse = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionAccessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: {
        property: 'object',
        value: 'page'
      },
      sort: {
        direction: 'descending',
        timestamp: 'last_edited_time'
      },
      page_size: 50
    })
  });

  if (!allPagesResponse.ok) {
    const errorText = await allPagesResponse.text();
    console.error(`❌ Notion API error: ${allPagesResponse.status} - ${errorText}`);
    throw new Error(`Notion API error: ${allPagesResponse.status}`);
  }

  const allPagesData = await allPagesResponse.json();
  console.log(`📄 Found ${allPagesData.results.length} total pages in workspace`);

  // Filter by date range
  const recentPages = allPagesData.results.filter(page => {
    const lastEdited = new Date(page.last_edited_time);
    const createdTime = new Date(page.created_time);
    return (lastEdited >= startDate && lastEdited <= endDate) || 
           (createdTime >= startDate && createdTime <= endDate);
  });

  console.log(`📅 Found ${recentPages.length} pages in date range (${contentDays} days)`);

  if (recentPages.length === 0) {
    // Get most recent pages for manual execution
    const mostRecentPages = allPagesData.results.slice(0, 5);
    
    if (mostRecentPages.length === 0) {
      return {
        summary: "📝 **Manual Execution Summary**\n\nNo pages found in your Notion workspace. Please check your integration permissions.",
        contentCount: 0
      };
    }
    
    const { content, processedCount } = await extractContentFromPages(mostRecentPages, notionAccessToken);
    const aiSummary = await generateGeminiSummary(content, schedule.summaryConfig, 'manual');
    
    return {
      summary: `📝 **Manual Execution Summary**\n\n${aiSummary}\n\n*No recent activity found. Processed ${processedCount} most recent pages.*`,
      contentCount: processedCount
    };
  }

  // Process recent pages
  const { content, processedCount } = await extractContentFromPages(recentPages.slice(0, 10), notionAccessToken);
  
  if (!content || content.trim().length === 0) {
    return {
      summary: `📝 **Manual Execution Summary**\n\nFound ${recentPages.length} pages but they appear to be empty.\n\n*Try adding more content to your Notion pages.*`,
      contentCount: recentPages.length
    };
  }

  // Generate AI summary
  const aiSummary = await generateGeminiSummary(content, schedule.summaryConfig, 'manual');

  return {
    summary: `📝 **Manual Execution Summary**\n\n${aiSummary}\n\n*Processed ${processedCount} pages from the last ${contentDays} days.*`,
    contentCount: processedCount
  };
}

/**
 * Enhanced content extraction from Notion pages
 */
async function extractContentFromPages(pages, notionAccessToken) {
  let allContent = '';
  let processedCount = 0;
  
  console.log(`📖 Extracting content from ${pages.length} pages...`);
  
  for (const page of pages) {
    try {
      const pageTitle = page.properties?.title?.title?.[0]?.plain_text || 'Untitled';
      console.log(`📄 Processing page: ${pageTitle}`);
      
      const contentResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children?page_size=100`, {
        headers: {
          'Authorization': `Bearer ${notionAccessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        const pageContent = extractTextFromBlocks(contentData.results);
        
        if (pageContent && pageContent.trim().length > 0) {
          allContent += `\n\n=== ${pageTitle} ===\n`;
          allContent += `Last edited: ${new Date(page.last_edited_time).toLocaleDateString()}\n`;
          allContent += pageContent;
          processedCount++;
          console.log(`✅ Extracted ${pageContent.length} characters from "${pageTitle}"`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.warn(`❌ Error processing page: ${error.message}`);
    }
  }
  
  return {
    content: allContent,
    processedCount
  };
}

/**
 * Extract text content from Notion blocks
 */
function extractTextFromBlocks(blocks) {
  let text = '';
  
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
        text += block.paragraph?.rich_text?.map(t => t.plain_text).join('') + '\n';
        break;
      case 'heading_1':
        text += '# ' + (block.heading_1?.rich_text?.map(t => t.plain_text).join('') || '') + '\n';
        break;
      case 'heading_2':
        text += '## ' + (block.heading_2?.rich_text?.map(t => t.plain_text).join('') || '') + '\n';
        break;
      case 'heading_3':
        text += '### ' + (block.heading_3?.rich_text?.map(t => t.plain_text).join('') || '') + '\n';
        break;
      case 'bulleted_list_item':
        text += '• ' + (block.bulleted_list_item?.rich_text?.map(t => t.plain_text).join('') || '') + '\n';
        break;
      case 'numbered_list_item':
        text += '1. ' + (block.numbered_list_item?.rich_text?.map(t => t.plain_text).join('') || '') + '\n';
        break;
      case 'to_do':
        const checked = block.to_do?.checked ? '✅' : '☐';
        text += `${checked} ${block.to_do?.rich_text?.map(t => t.plain_text).join('') || ''}\n`;
        break;
    }
  }
  
  return text;
}

/**
 * Enhanced Gemini AI summary generation
 */
async function generateGeminiSummary(content, summaryConfig, context = 'manual') {
  const apiKey = process.env.VITE_GOOGLE_AI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const style = summaryConfig?.style || 'executive';
  const length = summaryConfig?.length || 'medium';
  const focusAreas = summaryConfig?.focusAreas || ['tasks', 'decisions', 'insights'];

  const maxContentLength = 15000;
  const truncatedContent = content.length > maxContentLength ? 
    content.substring(0, maxContentLength) + '\n\n[Content truncated due to length...]' : 
    content;

  let prompt = `You are analyzing content from a Notion workspace for a manual summary request. `;
  prompt += `Create a comprehensive ${style} summary that is ${length} in length. `;
  prompt += `Focus particularly on: ${focusAreas.join(', ')}.\n\n`;
  
  prompt += `Instructions:\n`;
  prompt += `- Identify key themes and patterns across the content\n`;
  prompt += `- Extract actionable items and important decisions\n`;
  prompt += `- Highlight any deadlines, meetings, or time-sensitive information\n`;
  prompt += `- Note any questions or issues that need attention\n`;
  prompt += `- Organize the summary in a clear, scannable format\n`;
  prompt += `- Use emojis sparingly but effectively for visual organization\n\n`;
  
  prompt += `Content to analyze:\n${truncatedContent}`;

  const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
  let lastError = null;
  
  for (const model of models) {
    try {
      console.log(`🤖 Trying Gemini model: ${model}`);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (summary && summary.trim().length > 0) {
          console.log(`✅ Successfully generated summary with ${model}`);
          return summary;
        }
      } else {
        const errorText = await response.text();
        lastError = new Error(`${model} error: ${response.status} - ${errorText}`);
      }
      
    } catch (fetchError) {
      lastError = fetchError;
    }
  }
  
  throw lastError || new Error('All Gemini models failed to generate summary');
}

/**
 * Enhanced text extraction from Notion blocks
 */
function extractTextFromBlocks(blocks) {
  let text = '';
  
  for (const block of blocks) {
    try {
      switch (block.type) {
        case 'paragraph':
          const paragraphText = block.paragraph?.rich_text?.map(t => t.plain_text).join('') || '';
          if (paragraphText.trim()) {
            text += paragraphText + '\n\n';
          }
          break;
          
        case 'heading_1':
          const h1Text = block.heading_1?.rich_text?.map(t => t.plain_text).join('') || '';
          if (h1Text.trim()) {
            text += `# ${h1Text}\n\n`;
          }
          break;
          
        case 'heading_2':
          const h2Text = block.heading_2?.rich_text?.map(t => t.plain_text).join('') || '';
          if (h2Text.trim()) {
            text += `## ${h2Text}\n\n`;
          }
          break;
          
        case 'heading_3':
          const h3Text = block.heading_3?.rich_text?.map(t => t.plain_text).join('') || '';
          if (h3Text.trim()) {
            text += `### ${h3Text}\n\n`;
          }
          break;
          
        case 'bulleted_list_item':
          const bulletText = block.bulleted_list_item?.rich_text?.map(t => t.plain_text).join('') || '';
          if (bulletText.trim()) {
            text += `• ${bulletText}\n`;
          }
          break;
          
        case 'numbered_list_item':
          const numberedText = block.numbered_list_item?.rich_text?.map(t => t.plain_text).join('') || '';
          if (numberedText.trim()) {
            text += `1. ${numberedText}\n`;
          }
          break;
          
        case 'to_do':
          const todoText = block.to_do?.rich_text?.map(t => t.plain_text).join('') || '';
          if (todoText.trim()) {
            const checked = block.to_do?.checked ? '✅' : '☐';
            text += `${checked} ${todoText}\n`;
          }
          break;
          
        case 'toggle':
          const toggleText = block.toggle?.rich_text?.map(t => t.plain_text).join('') || '';
          if (toggleText.trim()) {
            text += `▶ ${toggleText}\n`;
          }
          break;
          
        case 'callout':
          const calloutText = block.callout?.rich_text?.map(t => t.plain_text).join('') || '';
          if (calloutText.trim()) {
            const emoji = block.callout?.icon?.emoji || '💡';
            text += `${emoji} ${calloutText}\n\n`;
          }
          break;
          
        case 'quote':
          const quoteText = block.quote?.rich_text?.map(t => t.plain_text).join('') || '';
          if (quoteText.trim()) {
            text += `> ${quoteText}\n\n`;
          }
          break;
          
        case 'code':
          const codeText = block.code?.rich_text?.map(t => t.plain_text).join('') || '';
          if (codeText.trim()) {
            const language = block.code?.language || 'text';
            text += `\`\`\`${language}\n${codeText}\n\`\`\`\n\n`;
          }
          break;
          
        default:
          if (block[block.type]?.rich_text) {
            const genericText = block[block.type].rich_text.map(t => t.plain_text).join('') || '';
            if (genericText.trim()) {
              text += genericText + '\n';
            }
          }
          break;
      }
    } catch (error) {
      console.warn(`Error extracting text from block type ${block.type}:`, error);
    }
  }
  
  return text.trim();
}

/**
 * Format and send message via Telegram (Enhanced version)
 */
async function sendTelegramMessage(chatId, summary) {
  const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  
  console.log(`Telegram: Attempting to send message to chat ${chatId}`);
  console.log(`Telegram: Bot token configured: ${!!botToken}`);
  
  if (!botToken) {
    throw new Error('Telegram bot token not configured');
  }

  if (!chatId || typeof chatId !== 'string' || chatId.trim().length === 0) {
    throw new Error('Invalid chat ID provided');
  }

  if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
    throw new Error('Message text is required');
  }

  // Format message like the frontend does
  const formattedMessage = formatSummaryForTelegram(summary);
  const truncatedMessage = formattedMessage.length > 4096 ? 
    formattedMessage.substring(0, 4090) + '...' : formattedMessage;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: truncatedMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    console.log(`Telegram: API response status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ description: 'Unknown error' }));
      console.error('Telegram: API error response:', errorData);
      throw new Error(`Telegram API error: ${errorData.description || `HTTP ${response.status}`}`);
    }

    const result = await response.json();
    console.log(`Telegram: Message sent successfully, ID: ${result.result?.message_id}`);
    return result;

  } catch (fetchError) {
    console.error('Telegram: Network error:', fetchError);
    throw new Error(`Telegram network error: ${fetchError.message}`);
  }
}

/**
 * Format summary for Telegram with proper HTML escaping and structure
 */
function formatSummaryForTelegram(summary) {
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  let message = `🧠 <b>Nemory AI Summary</b>\n\n`;
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  message += `📅 <b>Generated:</b> ${dateStr}\n`;
  message += `⏰ <b>Time:</b> ${timeStr}\n\n`;
  
  const escapedSummary = escapeHtml(summary);
  message += `📝 <b>Summary:</b>\n${escapedSummary}\n\n`;
  
  message += `---\n`;
  message += `Generated by Nemory AI 🚀\n`;
  message += `<i>Manual execution via dashboard</i>`;
  
  return message;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scheduleId, userId } = req.body;

    if (!scheduleId || !userId) {
      return res.status(400).json({ error: 'scheduleId and userId are required' });
    }

    // Get the schedule
    const scheduleDoc = await getDoc(doc(db, 'schedules', scheduleId));
    
    if (!scheduleDoc.exists()) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    const schedule = { id: scheduleDoc.id, ...scheduleDoc.data() };

    // Verify ownership
    if (schedule.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Execute the schedule
    const execution = await executeSchedule(schedule);

    res.status(200).json({
      success: true,
      execution: {
        id: execution.id,
        status: execution.status,
        executedAt: execution.executedAt,
        contentProcessed: execution.contentProcessed,
        deliveryResults: execution.deliveryResults,
        error: execution.error
      }
    });

  } catch (error) {
    console.error('❌ Manual execution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}