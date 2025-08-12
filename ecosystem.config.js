// PM2 ecosystem configuration for production deployment
module.exports = {
  apps: [
    {
      name: 'nemory-telegram-bot',
      script: 'telegram-polling-bot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      env_development: {
        NODE_ENV: 'development'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_file: './logs/bot-combined.log',
      time: true
    }
  ]
};