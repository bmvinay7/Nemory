// Simple Telegram bot to get chat IDs and test functionality
// Run this with: node telegram-bot.js

const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || '';
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

let offset = 0;

// Function to send a message
async function sendMessage(chatId, text) {
  try {
    const response = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
    });

    const result = await response.json();
    if (result.ok) {
      console.log(`✅ Message sent to ${chatId}`);
    } else {
      console.error(`❌ Failed to send message:`, result);
    }
    return result;
  } catch (error) {
    console.error('❌ Error sending message:', error);
    return null;
  }
}

// Function to get updates
async function getUpdates() {
  try {
    const response = await fetch(`${API_URL}/getUpdates?offset=${offset}`);
    const result = await response.json();
    
    if (result.ok && result.result.length > 0) {
      for (const update of result.result) {
        offset = update.update_id + 1;
        
        if (update.message) {
          const chatId = update.message.chat.id;
          const text = update.message.text;
          const firstName = update.message.from.first_name;
          
          console.log(`📨 Message from ${firstName} (${chatId}): ${text}`);
          
          // Respond with chat ID and welcome message
          const responseText = `🤖 *Nemory AI Bot*\n\n` +
            `Hello ${firstName}! 👋\n\n` +
            `Your Chat ID is: \`${chatId}\`\n\n` +
            `Copy this Chat ID and paste it in your Nemory app settings to receive AI summaries!\n\n` +
            `You can also send me any message and I'll echo it back to test the connection.`;
          
          await sendMessage(chatId, responseText);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error getting updates:', error);
  }
}

// Function to get bot info
async function getBotInfo() {
  try {
    const response = await fetch(`${API_URL}/getMe`);
    const result = await response.json();
    
    if (result.ok) {
      console.log('🤖 Bot Info:', result.result);
      console.log(`✅ Bot @${result.result.username} is running!`);
      console.log(`📱 Bot link: https://t.me/${result.result.username}`);
      return result.result;
    } else {
      console.error('❌ Failed to get bot info:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting bot info:', error);
    return null;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting Nemory Telegram Bot...');
  
  // Check if bot token is set
  if (!BOT_TOKEN || BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ Please set VITE_TELEGRAM_BOT_TOKEN in your environment variables');
    console.error('   Create a .env file with: VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here');
    process.exit(1);
  }
  
  // Get bot info
  const botInfo = await getBotInfo();
  if (!botInfo) {
    console.error('❌ Failed to connect to Telegram. Check your bot token.');
    process.exit(1);
  }
  
  console.log('✅ Bot connected successfully!');
  console.log('💬 Send a message to your bot to get your Chat ID');
  console.log('🔄 Listening for messages...\n');
  
  // Start polling for messages
  setInterval(getUpdates, 1000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Bot stopped');
  process.exit(0);
});

// Start the bot
main();