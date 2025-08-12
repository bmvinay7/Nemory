#!/bin/bash

# Simple bot starter script with auto-restart
echo "🤖 Starting Nemory Telegram Bot..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it with VITE_TELEGRAM_BOT_TOKEN"
    exit 1
fi

# Function to start bot with auto-restart
start_bot() {
    while true; do
        echo "🚀 Starting bot at $(date)"
        node telegram-polling-bot.js
        
        # If bot exits, wait 5 seconds and restart
        echo "⚠️  Bot stopped. Restarting in 5 seconds..."
        sleep 5
    done
}

# Handle Ctrl+C gracefully
trap 'echo "🛑 Stopping bot..."; exit 0' INT TERM

# Start the bot
start_bot