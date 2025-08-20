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
    // Get user's Notion access token
    console.log(`🔍 Looking for user: ${schedule.userId} in users collection`);
    const userDoc = await getDoc(doc(db, 'users', schedule.userId));
    
    if (!userDoc.exists()) {
      console.log(`❌ User document not found in 'users' collection for userId: ${schedule.userId}`);
      
      // Try checking notion_integrations collection as fallback
      console.log(`🔍 Checking notion_integrations collection...`);
      const notionDoc = await getDoc(doc(db, 'notion_integrations', schedule.userId));
      
      if (!notionDoc.exists()) {
        console.log(`❌ User not found in notion_integrations either`);
        throw new Error(`User not found in users or notion_integrations collections: ${schedule.userId}`);
      }
      
      console.log(`✅ Found user in notion_integrations collection`);
      const userData = notionDoc.data();
      const notionAccessToken = userData.accessToken;
      
      if (!notionAccessToken) {
        throw new Error('Notion access token not found in notion_integrations');
      }
      
      // Continue with execution using notion_integrations data
      const summaryResult = await generateAISummary(schedule, notionAccessToken);
      execution.contentProcessed = summaryResult.contentCount;
      
    } else {
      console.log(`✅ Found user in users collection`);
      const userData = userDoc.data();
      const notionAccessToken = userData.notionAccessToken;
      
      if (!notionAccessToken) {
        throw new Error('Notion access token not found in users collection');
      }
      
      // Continue with execution using users data
      const summaryResult = await generateAISummary(schedule, notionAccessToken);
      execution.contentProcessed = summaryResult.contentCount;
    }



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

    // Email delivery (placeholder for future implementation)
    if (schedule.deliveryMethods?.email?.enabled && schedule.deliveryMethods.email.address) {
      execution.deliveryResults.email = { 
        status: 'pending', 
        message: 'Email delivery not yet implemented',
        timestamp: new Date().toISOString()
      };
    }

    execution.status = deliverySuccess ? 'success' : 'failed';
    
  } catch (error) {
    console.error('❌ Schedule execution failed:', error);
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
      page_size: 50
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
      summary: "No recent content found for summarization.",
      contentCount: 0
    };
  }

  // Get content from pages
  let allContent = '';
  for (const page of recentPages.slice(0, 10)) { // Limit to 10 pages
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
    summary: aiSummary,
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

  console.log(`🤖 Calling Gemini API with key: ${apiKey ? 'Present' : 'Missing'}`);
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

  console.log(`🤖 Gemini API response status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.log(`❌ Gemini API error response: ${errorText}`);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate summary';
}

/**
 * Send message via Telegram
 */
async function sendTelegramMessage(chatId, message) {
  const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error('Telegram bot token not configured');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Telegram API error: ${errorData.description || response.status}`);
  }

  return response.json();
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