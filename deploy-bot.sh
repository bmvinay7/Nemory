#!/bin/bash

# Nemory Telegram Bot Deployment Script

echo "🤖 Nemory Telegram Bot Deployment"
echo "=================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with VITE_TELEGRAM_BOT_TOKEN"
    exit 1
fi

# Check if bot token is set
if ! grep -q "VITE_TELEGRAM_BOT_TOKEN" .env; then
    echo "❌ VITE_TELEGRAM_BOT_TOKEN not found in .env file"
    exit 1
fi

echo "📋 Choose deployment option:"
echo "1. Local development (with auto-restart)"
echo "2. PM2 (production process manager)"
echo "3. Docker (containerized)"
echo "4. Systemd service (Linux/macOS)"
echo "5. Railway (cloud deployment)"
echo "6. Render (cloud deployment)"

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo "🚀 Starting local development bot..."
        npm install
        npm run bot:dev
        ;;
    2)
        echo "🚀 Deploying with PM2..."
        npm install -g pm2
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        echo "✅ Bot deployed with PM2. Use 'pm2 status' to check status"
        ;;
    3)
        echo "🚀 Building and starting Docker container..."
        docker-compose -f docker-compose.bot.yml up -d --build
        echo "✅ Bot deployed with Docker. Use 'docker logs nemory-telegram-bot' to check logs"
        ;;
    4)
        echo "🚀 Setting up systemd service..."
        # Update paths in service file
        sed -i "s|/path/to/your/Nemory-dir|$(pwd)|g" nemory-bot.service
        sed -i "s|your-username|$(whoami)|g" nemory-bot.service
        
        sudo cp nemory-bot.service /etc/systemd/system/
        sudo systemctl daemon-reload
        sudo systemctl enable nemory-bot
        sudo systemctl start nemory-bot
        echo "✅ Bot deployed as systemd service. Use 'sudo systemctl status nemory-bot' to check status"
        ;;
    5)
        echo "🚀 Deploying to Railway..."
        echo "1. Install Railway CLI: npm install -g @railway/cli"
        echo "2. Login: railway login"
        echo "3. Create project: railway new"
        echo "4. Set environment variable: railway variables set VITE_TELEGRAM_BOT_TOKEN=your_token"
        echo "5. Deploy: railway up"
        echo "📝 Create railway.json with the following content:"
        cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node telegram-polling-bot.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOF
        echo "✅ railway.json created. Run the commands above to deploy."
        ;;
    6)
        echo "🚀 Deploying to Render..."
        echo "1. Connect your GitHub repo to Render"
        echo "2. Create a new Web Service"
        echo "3. Set build command: npm install"
        echo "4. Set start command: node telegram-polling-bot.js"
        echo "5. Add environment variable: VITE_TELEGRAM_BOT_TOKEN"
        echo "📝 Create render.yaml for easier deployment:"
        cat > render.yaml << EOF
services:
  - type: web
    name: nemory-telegram-bot
    env: node
    buildCommand: npm install
    startCommand: node telegram-polling-bot.js
    envVars:
      - key: VITE_TELEGRAM_BOT_TOKEN
        sync: false
EOF
        echo "✅ render.yaml created. Push to GitHub and deploy on Render."
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac