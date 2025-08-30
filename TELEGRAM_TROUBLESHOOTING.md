# Telegram Delivery Troubleshooting Guide

## Quick Diagnosis

Run this command to test your Telegram setup:
```bash
npm run test:telegram YOUR_CHAT_ID
```

Replace `YOUR_CHAT_ID` with your actual Telegram chat ID.

## Common Issues and Solutions

### 1. Bot Token Not Configured
**Error**: "Telegram bot token not configured"

**Solution**:
1. Check if `VITE_TELEGRAM_BOT_TOKEN` is set in your `.env` file
2. Verify the token format: should be like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
3. Make sure there are no extra spaces or quotes around the token

### 2. Invalid Chat ID
**Error**: "Invalid chat ID" or "Bad Request: chat not found"

**Solution**:
1. Get your chat ID by messaging your bot first
2. Run the bot locally: `npm run bot`
3. Send any message to your bot to get your chat ID
4. Use the exact chat ID provided (including negative sign for groups)

### 3. Parse Mode Errors
**Error**: "Bad Request: can't parse entities"

**Solution**:
- The system now uses HTML parse mode consistently
- If you see this error, it means there are conflicting parse modes
- All message formatting now uses HTML tags: `<b>bold</b>`, `<i>italic</i>`

### 4. Message Too Long
**Error**: "Bad Request: message is too long"

**Solution**:
- Messages are automatically truncated to 4096 characters
- If you still see this error, check for very long single lines

### 5. Bot Blocked by User
**Error**: "Forbidden: bot was blocked by the user"

**Solution**:
1. Unblock the bot in your Telegram app
2. Send `/start` to the bot to reactivate it
3. Try sending a test message again

## Testing Steps

### Step 1: Verify Environment Variables
```bash
# Check if your .env file has the required variables
cat .env | grep TELEGRAM
```

Should show:
```
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### Step 2: Test Bot Connection
```bash
# Test if the bot is reachable
curl "https://api.telegram.org/bot$VITE_TELEGRAM_BOT_TOKEN/getMe"
```

### Step 3: Get Your Chat ID
```bash
# Run the bot locally to get your chat ID
npm run bot
```

Then send any message to your bot.

### Step 4: Test Message Sending
```bash
# Test sending a message
npm run test:telegram YOUR_CHAT_ID
```

### Step 5: Test from Web Interface
1. Go to your Nemory app settings
2. Navigate to Telegram settings
3. Enter your chat ID
4. Click "Send Test Message"

## API Testing

You can also test the API directly:

```bash
# Test the new test endpoint
curl -X POST http://localhost:3000/api/test-telegram \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID"}'
```

## Debugging Logs

When testing, check the console logs for detailed information:

- ✅ `Telegram: Message sent successfully` - Everything working
- ❌ `Telegram: API error` - Check the error details
- ⚠️ `Telegram: Bot token configured: false` - Environment variable issue

## Environment Variable Issues

### Development
Make sure your `.env` file is in the root directory and contains:
```
VITE_TELEGRAM_BOT_TOKEN=your_actual_bot_token
```

### Production (Vercel)
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to Environment Variables
4. Add `VITE_TELEGRAM_BOT_TOKEN` with your bot token
5. Redeploy your application

## Bot Setup Reminder

If you haven't set up your bot yet:

1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow the instructions to create your bot
4. Copy the bot token to your `.env` file
5. Send `/setcommands` to BotFather (optional)
6. Add these commands:
   ```
   start - Get your chat ID and setup instructions
   help - Show help information
   ```

## Still Having Issues?

1. Check the Vercel function logs in your dashboard
2. Verify your bot token is correct by testing with curl
3. Make sure your chat ID is correct (try messaging the bot first)
4. Check if there are any network restrictions
5. Verify the bot hasn't been blocked or restricted

## Recent Fixes Applied

- ✅ Standardized parse mode to HTML across all components
- ✅ Added comprehensive error logging
- ✅ Improved input validation
- ✅ Added message length limits
- ✅ Enhanced error messages with more details
- ✅ Created test utilities for easier debugging