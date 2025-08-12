import { config } from 'dotenv';
config();

const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

let lastUpdateId = 0;

/**
 * Send message via Telegram Bot API
 */
async function sendMessage(chatId, text) {
  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'MarkdownV2'
      }),
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

/**
 * Get updates from Telegram
 */
async function getUpdates() {
  try {
    const response = await fetch(`${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
    const result = await response.json();
    
    if (result.ok && result.result.length > 0) {
      return result.result;
    }
    
    return [];
  } catch (error) {
    console.error('Error getting updates:', error);
    return [];
  }
}

/**
 * Process incoming message
 */
async function processMessage(message) {
  const chatId = message.chat.id.toString();
  const text = message.text?.toLowerCase().trim() || '';
  const userName = message.from.first_name || 'there';

  console.log(`📨 Message from ${userName} (${chatId}): ${text}`);

  // Auto-respond with chat ID for any message
  let responseText = '';

  if (text === '/start' || text.includes('hello') || text.includes('hi') || text === '/help') {
    responseText = `👋 Hello ${userName}\\!\n\n` +
      `Welcome to Nemory AI Bot\\! 🧠\n\n` +
      `Your Chat ID is: \`${chatId}\`\n\n` +
      `📋 *How to use:*\n` +
      `1\\. Copy your Chat ID above\n` +
      `2\\. Go to Nemory settings\n` +
      `3\\. Paste your Chat ID\n` +
      `4\\. Click Save and Send Test\n\n` +
      `Once configured, you'll receive AI summaries of your Notion notes here\\! 🚀`;
  } else {
    // For any other message, just provide the chat ID
    responseText = `🤖 *Nemory AI Bot*\n\n` +
      `Your Chat ID is: \`${chatId}\`\n\n` +
      `Copy this ID and paste it in your Nemory settings to receive AI summaries\\! 📝`;
  }

  // Send response
  const sent = await sendMessage(chatId, responseText);
  if (sent) {
    console.log(`✅ Sent chat ID to ${userName}`);
  } else {
    console.log(`❌ Failed to send message to ${userName}`);
  }
}

/**
 * Main polling loop
 */
async function startPolling() {
  console.log('🤖 Starting Telegram bot polling...');
  console.log(`📡 Bot token: ${BOT_TOKEN ? 'Configured' : 'Missing'}`);
  
  if (!BOT_TOKEN) {
    console.error('❌ VITE_TELEGRAM_BOT_TOKEN not found in environment variables');
    process.exit(1);
  }

  // Test bot connection
  try {
    const response = await fetch(`${TELEGRAM_API}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      console.log(`✅ Connected to bot: @${result.result.username} (${result.result.first_name})`);
    } else {
      console.error('❌ Failed to connect to bot:', result.description);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Bot connection error:', error);
    process.exit(1);
  }

  // Start polling
  while (true) {
    try {
      const updates = await getUpdates();
      
      for (const update of updates) {
        lastUpdateId = update.update_id;
        
        if (update.message && update.message.text) {
          await processMessage(update.message);
        }
      }
      
      // Small delay to prevent excessive API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Polling error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds on error
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down bot...');
  process.exit(0);
});

// Start the bot
startPolling().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});