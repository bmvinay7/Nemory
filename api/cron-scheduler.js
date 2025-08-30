/**
 * Vercel Cron Job Handler for Nemory Scheduling System
 * This function runs independently of user browser sessions
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, addDoc, Timestamp, connectFirestoreEmulator } from 'firebase/firestore';

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
 * Check if a schedule is due for execution (Free tier: runs once daily at 9 AM UTC)
 * We'll execute all schedules that should have run in the last 24 hours
 */
function isScheduleDue(schedule) {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentDate = now.getDate();

  // Since we can only run once per day, we need to check if this schedule
  // should have executed in the last 24 hours
  
  switch (schedule.frequency) {
    case 'daily':
      // Daily schedules should always run when the cron job executes
      return true;

    case 'weekly':
      // Convert schedule days to numbers (Monday = 1, Sunday = 0)
      const scheduleDays = schedule.daysOfWeek?.map(day => {
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        return dayMap[day.toLowerCase()];
      }) || [];
      return scheduleDays.includes(currentDay);

    case 'monthly':
      return currentDate === schedule.dayOfMonth;

    default:
      return false;
  }
}

/**
 * Execute a single schedule
 */
async function executeSchedule(schedule) {
  console.log(`🚀 Executing schedule: ${schedule.name} (${schedule.id})`);

  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const execution = {
    id: executionId,
    scheduleId: schedule.id,
    userId: schedule.userId,
    executedAt: Timestamp.now(),
    status: 'running',
    contentProcessed: 0,
    deliveryResults: {}
  };

  try {
    // Get user's Notion access token - check notion_integrations first since that's where it's actually stored
    console.log(`🔍 Looking for Notion integration for user: ${schedule.userId}`);
    
    let notionAccessToken = null;
    let userData = null;
    
    // Primary: Check notion_integrations collection (this is where Notion data is actually stored)
    console.log(`🔍 Checking notion_integrations collection...`);
    const notionDoc = await getDoc(doc(db, 'notion_integrations', schedule.userId));
    
    if (notionDoc.exists()) {
      console.log(`✅ Found user in notion_integrations collection`);
      userData = notionDoc.data();
      notionAccessToken = userData.accessToken;
      
      if (!notionAccessToken) {
        throw new Error('Notion access token not found in notion_integrations collection');
      }
    } else {
      // Fallback: Check users collection (legacy or alternative storage)
      console.log(`⚠️ User not found in notion_integrations, checking users collection as fallback...`);
      const userDoc = await getDoc(doc(db, 'users', schedule.userId));
      
      if (!userDoc.exists()) {
        throw new Error(`Notion integration not found for user ${schedule.userId}. User may need to reconnect their Notion workspace.`);
      }
      
      console.log(`✅ Found user in users collection (fallback)`);
      userData = userDoc.data();
      notionAccessToken = userData.notionAccessToken;
      
      if (!notionAccessToken) {
        throw new Error(`Notion access token not found for user ${schedule.userId}. User may need to reconnect their Notion workspace.`);
      }
    }
    
    console.log(`🔑 Notion access token found, proceeding with content generation...`);
    
    // Generate AI summary with the found access token
    const summaryResult = await generateAISummary(schedule, notionAccessToken);
    execution.contentProcessed = summaryResult.contentCount;



    console.log(`📊 Summary generated successfully, content count: ${summaryResult.contentCount}`);
    
    // Deliver via configured channels
    let deliverySuccess = false;

    console.log(`📱 Checking delivery methods:`, JSON.stringify(schedule.deliveryMethods, null, 2));

    // Telegram delivery
    if (schedule.deliveryMethods?.telegram?.enabled && schedule.deliveryMethods.telegram.chatId) {
      try {
        console.log(`📱 Sending Telegram message to chat: ${schedule.deliveryMethods.telegram.chatId}`);
        await sendTelegramMessage(schedule.deliveryMethods.telegram.chatId, summaryResult.summary);
        execution.deliveryResults.telegram = { status: 'success', timestamp: new Date().toISOString() };
        deliverySuccess = true;
        console.log(`✅ Telegram delivery successful`);
      } catch (telegramError) {
        console.log(`❌ Telegram delivery failed: ${telegramError.message}`);
        execution.deliveryResults.telegram = { 
          status: 'failed', 
          error: telegramError.message,
          timestamp: new Date().toISOString()
        };
      }
    } else {
      console.log(`⚠️ Telegram delivery not configured or disabled`);
      execution.deliveryResults.telegram = { 
        status: 'skipped', 
        reason: 'Not configured or disabled',
        timestamp: new Date().toISOString()
      };
    }

    // Email delivery (placeholder for future implementation)
    if (schedule.deliveryMethods?.email?.enabled && schedule.deliveryMethods.email.address) {
      execution.deliveryResults.email = { 
        status: 'pending', 
        message: 'Email delivery not yet implemented',
        timestamp: new Date().toISOString()
      };
    }

    if (deliverySuccess) {
      execution.status = 'success';
      console.log(`🎉 Schedule execution completed successfully`);
    } else {
      execution.status = 'failed';
      execution.error = 'No delivery methods succeeded';
      console.log(`❌ Schedule execution failed: No delivery methods succeeded`);
    }
    
  } catch (error) {
    console.error('❌ Schedule execution failed with exception:', error);
    console.error('❌ Error stack:', error.stack);
    execution.status = 'failed';
    execution.error = error.message;
  }

  // Log execution to Firestore
  try {
    await addDoc(collection(db, 'schedule_executions'), execution);
    console.log(`📝 Execution logged for schedule ${schedule.id} with status: ${execution.status}`);
  } catch (logError) {
    console.error('Failed to log execution:', logError);
  }

  return execution;
}

/**
 * Generate AI summary using Notion content (Enhanced version)
 */
async function generateAISummary(schedule, notionAccessToken) {
  console.log(`🔍 Starting content search for schedule: ${schedule.name}`);
  
  // Use a more flexible date range - default to 14 days instead of 7
  const contentDays = schedule.summaryConfig?.contentDays || 14;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - contentDays);
  
  console.log(`📅 Searching for content from ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // First, try to get all pages without date filtering to see what's available
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
      page_size: 100
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
    // Include pages that were either edited or created in the time range
    return (lastEdited >= startDate && lastEdited <= endDate) || 
           (createdTime >= startDate && createdTime <= endDate);
  });

  console.log(`📅 Found ${recentPages.length} pages in date range (${contentDays} days)`);

  // If no recent pages, try with a longer time range (30 days)
  if (recentPages.length === 0) {
    console.log(`⚠️ No recent pages found, trying 30-day range...`);
    const extendedStartDate = new Date();
    extendedStartDate.setDate(extendedStartDate.getDate() - 30);
    
    const extendedPages = allPagesData.results.filter(page => {
      const lastEdited = new Date(page.last_edited_time);
      const createdTime = new Date(page.created_time);
      return (lastEdited >= extendedStartDate && lastEdited <= endDate) || 
             (createdTime >= extendedStartDate && createdTime <= endDate);
    });
    
    console.log(`📅 Found ${extendedPages.length} pages in extended 30-day range`);
    
    if (extendedPages.length === 0) {
      // If still no pages, get the most recent 5 pages regardless of date
      console.log(`⚠️ Still no pages found, getting most recent 5 pages...`);
      const mostRecentPages = allPagesData.results.slice(0, 5);
      
      if (mostRecentPages.length === 0) {
        return {
          summary: `📋 **No Content Available**\n\nYour Notion workspace appears to be empty or the integration doesn't have access to any pages.\n\n**Troubleshooting:**\n• Check if the Notion integration has access to your pages\n• Verify that pages exist in your workspace\n• Try reconnecting your Notion integration`,
          contentCount: 0
        };
      }
      
      // Process the most recent pages
      const { content, processedCount } = await extractContentFromPages(mostRecentPages, notionAccessToken);
      const aiSummary = await generateGeminiSummary(content, schedule.summaryConfig, 'recent');
      
      return {
        summary: `📋 **Recent Content Summary**\n\n${aiSummary}\n\n*Note: No recent activity found in the last ${contentDays} days. This summary includes your most recent ${processedCount} pages.*`,
        contentCount: processedCount
      };
    }
    
    // Use extended pages
    const { content, processedCount } = await extractContentFromPages(extendedPages.slice(0, 15), notionAccessToken);
    const aiSummary = await generateGeminiSummary(content, schedule.summaryConfig, 'extended');
    
    return {
      summary: `📋 **Extended Period Summary**\n\n${aiSummary}\n\n*Processed ${processedCount} pages from the last 30 days.*`,
      contentCount: processedCount
    };
  }

  // Process recent pages
  const { content, processedCount } = await extractContentFromPages(recentPages.slice(0, 15), notionAccessToken);
  
  if (!content || content.trim().length === 0) {
    return {
      summary: `📋 **Pages Found But No Content**\n\nFound ${recentPages.length} pages but they appear to be empty or contain only formatting.\n\n**Recent Pages:**\n${recentPages.slice(0, 5).map(page => `• ${page.properties?.title?.title?.[0]?.plain_text || 'Untitled'}`).join('\n')}\n\n*Try adding more content to your Notion pages.*`,
      contentCount: recentPages.length
    };
  }

  // Generate AI summary
  let aiSummary;
  
  try {
    console.log(`🤖 Generating AI summary for ${processedCount} pages with ${content.length} characters...`);
    aiSummary = await generateGeminiSummary(content, schedule.summaryConfig, 'normal');
    console.log(`✅ AI summary generated successfully`);
  } catch (aiError) {
    console.log(`⚠️ AI summary failed, using fallback: ${aiError.message}`);
    // Enhanced fallback summary
    aiSummary = `📋 **Content Overview** (${new Date().toLocaleDateString()})\n\n` +
                `**Recent Activity:** Found ${recentPages.length} pages with activity in the last ${contentDays} days\n\n` +
                `**Pages Processed:**\n` +
                recentPages.slice(0, 8).map((page, index) => {
                  const title = page.properties?.title?.title?.[0]?.plain_text || 'Untitled';
                  const lastEdited = new Date(page.last_edited_time).toLocaleDateString();
                  return `${index + 1}. **${title}** (edited ${lastEdited})`;
                }).join('\n') +
                `\n\n**Content Preview:**\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}` +
                `\n\n*AI summarization temporarily unavailable. Showing content overview instead.*`;
  }

  return {
    summary: aiSummary,
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
      
      // Get page content
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
        } else {
          console.log(`⚠️ No content found in "${pageTitle}"`);
        }
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.warn(`❌ Failed to get content for page "${pageTitle}": ${contentResponse.status}`);
      }
    } catch (error) {
      console.warn(`❌ Error processing page: ${error.message}`);
    }
  }
  
  console.log(`📊 Content extraction complete: ${processedCount} pages, ${allContent.length} characters`);
  
  return {
    content: allContent,
    processedCount
  };
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
          
        case 'divider':
          text += '---\n\n';
          break;
          
        case 'table':
          text += '[Table content]\n\n';
          break;
          
        case 'table_row':
          const rowText = block.table_row?.cells?.map(cell => 
            cell.map(t => t.plain_text).join('')
          ).join(' | ') || '';
          if (rowText.trim()) {
            text += `| ${rowText} |\n`;
          }
          break;
          
        default:
          // Try to extract text from any rich_text property
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
 * Enhanced Gemini AI summary generation
 */
async function generateGeminiSummary(content, summaryConfig, context = 'normal') {
  const apiKey = process.env.VITE_GOOGLE_AI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const style = summaryConfig?.style || 'executive';
  const length = summaryConfig?.length || 'medium';
  const focusAreas = summaryConfig?.focusAreas || ['tasks', 'decisions', 'insights'];

  // Limit content length to avoid API limits (Gemini has ~32k token limit)
  const maxContentLength = 15000; // More generous limit
  const truncatedContent = content.length > maxContentLength ? 
    content.substring(0, maxContentLength) + '\n\n[Content truncated due to length...]' : 
    content;

  // Create context-aware prompt
  let prompt = '';
  
  switch (context) {
    case 'recent':
      prompt = `You are analyzing the most recent content from a Notion workspace. `;
      break;
    case 'extended':
      prompt = `You are analyzing content from the past 30 days from a Notion workspace. `;
      break;
    default:
      prompt = `You are analyzing recent content from a Notion workspace. `;
  }
  
  prompt += `Create a comprehensive ${style} summary that is ${length} in length. `;
  prompt += `Focus particularly on: ${focusAreas.join(', ')}.\n\n`;
  
  // Add specific instructions for better summaries
  prompt += `Instructions:\n`;
  prompt += `- Identify key themes and patterns across the content\n`;
  prompt += `- Extract actionable items and important decisions\n`;
  prompt += `- Highlight any deadlines, meetings, or time-sensitive information\n`;
  prompt += `- Note any questions or issues that need attention\n`;
  prompt += `- Organize the summary in a clear, scannable format\n`;
  prompt += `- Use emojis sparingly but effectively for visual organization\n\n`;
  
  prompt += `Content to analyze:\n${truncatedContent}`;
  
  console.log(`📝 Enhanced prompt: ${prompt.length} characters, content: ${truncatedContent.length} characters`);

  // Try multiple models for better reliability
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
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });
      
      console.log(`🤖 ${model} response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (summary && summary.trim().length > 0) {
          console.log(`✅ Successfully generated summary with ${model} (${summary.length} characters)`);
          return summary;
        } else {
          console.log(`⚠️ ${model} returned empty summary`);
          lastError = new Error(`${model} returned empty summary`);
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ ${model} error: ${response.status} - ${errorText}`);
        lastError = new Error(`${model} error: ${response.status} - ${errorText}`);
      }
      
    } catch (fetchError) {
      console.log(`❌ ${model} fetch error: ${fetchError.message}`);
      lastError = fetchError;
    }
  }
  
  // If all models failed, throw the last error
  throw lastError || new Error('All Gemini models failed to generate summary');
}

/**
 * Format and send message via Telegram (Enhanced version matching frontend)
 */
async function sendTelegramMessage(chatId, summary) {
  const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  
  console.log(`Telegram: Attempting to send message to chat ${chatId}`);
  console.log(`Telegram: Bot token configured: ${!!botToken}`);
  
  if (!botToken) {
    throw new Error('Telegram bot token not configured');
  }

  // Validate chat ID
  if (!chatId || typeof chatId !== 'string' || chatId.trim().length === 0) {
    throw new Error('Invalid chat ID provided');
  }

  // Ensure message is not empty and within limits
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
  // Escape HTML characters for Telegram
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  let message = `🧠 <b>Nemory AI Summary</b>\n\n`;
  
  // Add timestamp
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
  
  // Add the main summary content (escape HTML)
  const escapedSummary = escapeHtml(summary);
  message += `📝 <b>Summary:</b>\n${escapedSummary}\n\n`;
  
  // Add footer
  message += `---\n`;
  message += `Generated by Nemory AI 🚀\n`;
  message += `<i>Automated delivery via scheduled summary</i>`;
  
  return message;
}

/**
 * Main cron handler function
 */
export default async function handler(req, res) {
  // Verify this is a cron request (security check)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  console.log('🕐 Daily cron job triggered at:', new Date().toISOString());
  console.log('📋 Vercel Free Tier: Running daily batch execution of all due schedules');

  try {
    // Test Firestore connection first
    console.log('🔍 Testing Firestore connection...');
    
    // Get all active schedules
    const schedulesQuery = query(
      collection(db, 'schedules'),
      where('isActive', '==', true)
    );

    console.log('📋 Querying schedules collection...');
    const schedulesSnapshot = await getDocs(schedulesQuery);
    const allSchedules = schedulesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📅 Found ${allSchedules.length} active schedules`);

    // Check which schedules are due
    const dueSchedules = allSchedules.filter(isScheduleDue);
    console.log(`⏰ ${dueSchedules.length} schedules are due for execution`);

    // Execute due schedules
    const executions = [];
    for (const schedule of dueSchedules) {
      try {
        const execution = await executeSchedule(schedule);
        executions.push(execution);
      } catch (error) {
        console.error(`Failed to execute schedule ${schedule.id}:`, error);
        executions.push({
          scheduleId: schedule.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      totalSchedules: allSchedules.length,
      dueSchedules: dueSchedules.length,
      executions: executions.map(e => ({
        scheduleId: e.scheduleId,
        status: e.status,
        error: e.error
      }))
    });

  } catch (error) {
    console.error('❌ Cron job failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}