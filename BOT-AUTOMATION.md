# 🤖 Telegram Bot Automation Guide

No more manual `node` commands! Here are all the ways to automate your Nemory Telegram bot:

## 🚀 Quick Start Options

### 1. **Easiest: Development with Auto-Restart**
```bash
# Start both your app AND bot together
npm run dev:with-bot

# Or just the bot with auto-restart
npm run bot:dev
```

### 2. **Simple Auto-Restart Script**
```bash
# Start bot with automatic restart on crash
./start-bot.sh
```

### 3. **One-Click Deployment**
```bash
# Interactive deployment script
./deploy-bot.sh
```

## 📋 Available Commands

```bash
# Development
npm run bot:dev          # Bot with auto-restart (nodemon)
npm run dev:with-bot     # App + Bot together

# Production
npm run bot              # Start bot once
npm run bot:webhook      # Start webhook server
npm run bot:webhook:dev  # Webhook server with auto-restart
```

## 🏗️ Production Deployment Options

### Option A: PM2 (Recommended for VPS)
```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Auto-start on system boot
pm2 startup
```

**Benefits:**
- ✅ Auto-restart on crash
- ✅ Auto-start on system reboot
- ✅ Process monitoring
- ✅ Log management
- ✅ Zero-downtime restarts

### Option B: Docker (Recommended for Cloud)
```bash
# Build and start container
docker-compose -f docker-compose.bot.yml up -d

# View logs
docker logs nemory-telegram-bot

# Stop container
docker-compose -f docker-compose.bot.yml down
```

**Benefits:**
- ✅ Isolated environment
- ✅ Easy deployment
- ✅ Consistent across environments
- ✅ Auto-restart on crash

### Option C: Systemd Service (Linux/macOS)
```bash
# Install service
sudo cp nemory-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nemory-bot
sudo systemctl start nemory-bot

# Check status
sudo systemctl status nemory-bot
```

**Benefits:**
- ✅ System-level integration
- ✅ Auto-start on boot
- ✅ System logging
- ✅ Service management

## ☁️ Cloud Deployment Options

### Railway (Easiest Cloud Option)
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway new`
4. Set environment: `railway variables set VITE_TELEGRAM_BOT_TOKEN=your_token`
5. Deploy: `railway up`

### Render
1. Connect GitHub repo to Render
2. Create new Web Service
3. Set start command: `node telegram-polling-bot.js`
4. Add environment variable: `VITE_TELEGRAM_BOT_TOKEN`

### Vercel (Serverless)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Heroku
```bash
# Install Heroku CLI
# Create Heroku app
heroku create nemory-telegram-bot

# Set environment variable
heroku config:set VITE_TELEGRAM_BOT_TOKEN=your_token

# Deploy
git push heroku main
```

## 🔧 Environment Setup

Make sure your `.env` file contains:
```env
VITE_TELEGRAM_BOT_TOKEN=your_bot_token_here
```

## 📊 Monitoring & Logs

### PM2 Monitoring
```bash
pm2 status              # Check status
pm2 logs nemory-telegram-bot  # View logs
pm2 restart nemory-telegram-bot  # Restart
pm2 stop nemory-telegram-bot     # Stop
```

### Docker Monitoring
```bash
docker logs nemory-telegram-bot  # View logs
docker stats nemory-telegram-bot # Resource usage
```

### Systemd Monitoring
```bash
sudo systemctl status nemory-bot    # Check status
sudo journalctl -u nemory-bot -f    # View logs
sudo systemctl restart nemory-bot   # Restart
```

## 🚨 Troubleshooting

### Bot Not Starting?
1. Check if `VITE_TELEGRAM_BOT_TOKEN` is set in `.env`
2. Verify bot token is valid
3. Check network connectivity
4. Review logs for errors

### Bot Keeps Crashing?
1. Check logs for error messages
2. Verify environment variables
3. Ensure sufficient memory/resources
4. Check Telegram API limits

### Can't Receive Messages?
1. Verify bot token is correct
2. Check if bot is blocked by user
3. Ensure bot has permission to send messages
4. Test with `/start` command

## 🎯 Recommended Setup

**For Development:**
```bash
npm run dev:with-bot
```

**For Production (VPS):**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**For Production (Cloud):**
Deploy to Railway or Render with automatic restarts.

## 🔄 Auto-Updates

To automatically update and restart the bot when you push changes:

### With PM2:
```bash
# Create update script
echo '#!/bin/bash
git pull
npm install
pm2 restart nemory-telegram-bot' > update-bot.sh
chmod +x update-bot.sh

# Set up cron job for daily updates
crontab -e
# Add: 0 2 * * * /path/to/your/project/update-bot.sh
```

### With Docker:
```bash
# Create update script
echo '#!/bin/bash
git pull
docker-compose -f docker-compose.bot.yml up -d --build' > update-bot.sh
chmod +x update-bot.sh
```

## 🎉 That's It!

Your bot will now run automatically without manual intervention. Choose the option that best fits your setup and enjoy automated Telegram delivery! 🚀