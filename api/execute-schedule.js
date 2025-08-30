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
 * Generate AI summary using Notion content
 */
async function generateAISummary(schedule, notionAccessToken) {
  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (schedule.summaryConfig?.contentDays || 7));

  // Search Notion for recent content
  const searchResponse = await fetch('https://api.notion.com/v1/search', {
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
      page_size: 20
    })
  });

  if (!searchResponse.ok) {
    throw new Error(`Notion API error: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const recentPages = searchData.results.filter(page => {
    const lastEdited = new Date(page.last_edited_time);
    return lastEdited >= startDate && lastEdited <= endDate;
  });

  if (recentPages.length === 0) {
    return {
      summary: "📝 **Manual Execution Summary**\n\nNo recent content found for summarization in the specified time window.\n\n*Try adjusting the content days setting or check if there's been recent activity in your Notion workspace.*",
      contentCount: 0
    };
  }

  // Get content from pages
  let allContent = '';
  for (const page of recentPages.slice(0, 5)) { // Limit to 5 pages for manual execution
    try {
      const contentResponse = await fetch(`https://api.notion.com/v1/blocks/${page.id}/children`, {
        headers: {
          'Authorization': `Bearer ${notionAccessToken}`,
          'Notion-Version': '2022-06-28'
        }
      });

      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        const pageContent = extractTextFromBlocks(contentData.results);
        allContent += `\n\n--- ${page.properties?.title?.title?.[0]?.plain_text || 'Untitled'} ---\n${pageContent}`;
      }
    } catch (error) {
      console.warn(`Failed to get content for page ${page.id}:`, error);
    }
  }

  // Generate AI summary
  const aiSummary = await generateGeminiSummary(allContent, schedule.summaryConfig);

  return {
    summary: `📝 **Manual Execution Summary**\n\n${aiSummary}\n\n*This summary was manually triggered and processed ${recentPages.length} recent pages.*`,
    contentCount: recentPages.length
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
 * Generate summary using Google Gemini AI
 */
async function generateGeminiSummary(content, summaryConfig) {
  const apiKey = process.env.VITE_GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const style = summaryConfig?.style || 'executive';
  const length = summaryConfig?.length || 'medium';
  const focusAreas = summaryConfig?.focusAreas || ['tasks', 'decisions'];

  let prompt = `Please create a ${style} summary of the following content. `;
  prompt += `Make it ${length} length and focus on: ${focusAreas.join(', ')}.\n\n`;
  prompt += `Content:\n${content}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate summary';
}

/**
 * Send message via Telegram with improved error handling
 */
async function sendTelegramMessage(chatId, message) {
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
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('Message text is required');
  }

  const truncatedMessage = message.length > 4096 ? message.substring(0, 4090) + '...' : message;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: truncatedMessage,
        parse_mode: 'HTML'
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