import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
config();

const app = express();
const PORT = process.env.TELEGRAM_WEBHOOK_PORT || 3001;
const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN;

app.use(cors());
app.use(express.json());

// Telegram Bot API base URL
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

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
 * Webhook endpoint for Telegram
 */
app.post('/webhook/telegram', async (req, res) => {
  try {
    const update = req.body;
    
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const message = update.message;
    const chatId = message.chat.id.toString();
    const text = message.text.toLowerCase().trim();
    const userName = message.from.first_name || 'there';

    console.log(`Received message from ${userName} (${chatId}): ${text}`);

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
    await sendMessage(chatId, responseText);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    botConfigured: !!BOT_TOKEN 
  });
});

/**
 * Set webhook endpoint
 */
app.post('/setup-webhook', async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ error: 'webhookUrl is required' });
    }

    const response = await fetch(`${TELEGRAM_API}/setWebhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message']
      }),
    });

    const result = await response.json();
    
    if (result.ok) {
      res.json({ success: true, message: 'Webhook set successfully' });
    } else {
      res.status(400).json({ error: result.description });
    }
  } catch (error) {
    console.error('Error setting webhook:', error);
    res.status(500).json({ error: 'Failed to set webhook' });
  }
});

/**
 * Get webhook info
 */
app.get('/webhook-info', async (req, res) => {
  try {
    const response = await fetch(`${TELEGRAM_API}/getWebhookInfo`);
    const result = await response.json();
    res.json(result.result);
  } catch (error) {
    console.error('Error getting webhook info:', error);
    res.status(500).json({ error: 'Failed to get webhook info' });
  }
});

app.listen(PORT, () => {
  console.log(`🤖 Telegram webhook server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook/telegram`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  
  if (!BOT_TOKEN) {
    console.warn('⚠️  VITE_TELEGRAM_BOT_TOKEN not found in environment variables');
  } else {
    console.log('✅ Bot token configured');
  }
});