# Telegram Bot Setup Instructions

## Current Status
❌ **The bot is NOT currently set up to automatically respond with chat IDs**

The current implementation only sends outgoing messages (summaries and test messages) but doesn't handle incoming messages from users.

## Quick Setup Options

### Option A: Simple Polling Bot (Easiest for Development)

1. **Start the polling bot:**
```bash
# Make sure your .env file has VITE_TELEGRAM_BOT_TOKEN
node telegram-polling-bot.js
```

That's it! The bot will now automatically respond to any message with the user's chat ID.

### Option B: Webhook Server (For Production)

1. **Install Dependencies:**
```bash
# Install webhook dependencies
npm install express cors dotenv nodemon
```

2. **Start the Webhook Server:**
```bash
node telegram-webhook-server.js
```

### 3. Set Up Webhook (for production)
For production, you'll need a public HTTPS URL. You can use:
- Ngrok (for testing): `ngrok http 3001`
- Deploy to Vercel, Netlify, or Railway
- Use your own server

```bash
# Example with ngrok
ngrok http 3001

# Then set the webhook
curl -X POST http://localhost:3001/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://your-ngrok-url.ngrok.io/webhook/telegram"}'
```

## What the Bot Will Do

Once set up, when users message your bot:

1. **First message or /start**: 
   ```
   👋 Hello [Name]!
   
   Welcome to Nemory AI Bot! 🧠
   
   Your Chat ID is: `123456789`
   
   📋 How to use:
   1. Copy your Chat ID above
   2. Go to Nemory settings
   3. Paste your Chat ID
   4. Click Save and Send Test
   
   Once configured, you'll receive AI summaries of your Notion notes here! 🚀
   ```

2. **Any other message**:
   ```
   🤖 Nemory AI Bot
   
   Your Chat ID is: `123456789`
   
   Copy this ID and paste it in your Nemory settings to receive AI summaries! 📝
   ```

## Alternative: Manual Chat ID Instructions

If you don't want to set up the webhook server, you can provide users with these instructions:

### Method 1: Using @userinfobot
1. Start a chat with @userinfobot on Telegram
2. Send any message
3. The bot will reply with your user info including your Chat ID

### Method 2: Using Browser Developer Tools
1. Open Telegram Web (web.telegram.org)
2. Start a chat with your bot
3. Open browser developer tools (F12)
4. Go to Network tab
5. Send a message to the bot
6. Look for API calls - your chat ID will be in the URL

### Method 3: Using Telegram Desktop
1. Right-click on the chat with your bot
2. Select "Copy Link"
3. The chat ID is in the URL after "tgaddr://"

## Production Deployment Options

### Option 1: Vercel (Recommended)
```bash
# Create vercel.json
{
  "functions": {
    "telegram-webhook-server.js": {
      "runtime": "nodejs18.x"
    }
  },
  "routes": [
    { "src": "/(.*)", "dest": "/telegram-webhook-server.js" }
  ]
}

# Deploy
vercel --prod
```

### Option 2: Railway
```bash
railway login
railway new
railway add
railway deploy
```

### Option 3: Render
1. Connect your GitHub repo
2. Set environment variables
3. Deploy as a web service

## Environment Variables Needed
```
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_PORT=3001
```

## Testing the Setup
1. Start the webhook server
2. Set up the webhook URL
3. Message your bot on Telegram
4. Check server logs to see if messages are received
5. Bot should respond with chat ID automatically