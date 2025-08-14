# 📅 Automated Scheduling Guide

## Overview

The Nemory scheduling system allows you to automate AI summary generation and delivery. Set up custom schedules to receive AI-powered summaries of your Notion content at regular intervals via Telegram or email.

## Features

### ⏰ Flexible Scheduling
- **Daily**: Every day at a specific time
- **Weekly**: Specific days of the week at a specific time
- **Monthly**: Specific day of the month at a specific time
- **Custom**: Advanced cron expressions (coming soon)

### 🎯 Smart Summarization
- **Multiple Styles**: Executive, detailed, bullet points, or action-focused
- **Customizable Length**: Short, medium, or long summaries
- **Focus Areas**: Tasks, ideas, decisions, meetings, projects, learning
- **Content Window**: Choose how many days back to analyze (1-30 days)

### 📱 Multi-Channel Delivery
- **Telegram**: Instant delivery to your Telegram chat
- **Email**: Professional email summaries (coming soon)

### 📊 Comprehensive Tracking
- Execution history and statistics
- Success/failure tracking
- Performance metrics
- Error logging and debugging

## Getting Started

### 1. Prerequisites

Before creating schedules, ensure you have:

- ✅ **Notion Integration**: Connected your Notion workspace
- ✅ **Telegram Setup**: Configured your Telegram bot and chat ID
- ✅ **AI Configuration**: Google AI API key configured

### 2. Creating Your First Schedule

1. **Navigate to Schedules**
   - Go to Dashboard → Schedules tab
   - Click "Create Schedule"

2. **Basic Settings** (Step 1)
   - **Name**: Give your schedule a descriptive name
   - **Frequency**: Choose daily, weekly, or monthly
   - **Time**: Set the execution time (24-hour format)
   - **Days**: For weekly schedules, select specific days

3. **Summary Configuration** (Step 2)
   - **Style**: Choose how you want summaries formatted
   - **Length**: Select the desired summary length
   - **Content Days**: How far back to look for content
   - **Focus Areas**: Select what types of content to prioritize
   - **Options**: Include action items and priority levels

4. **Delivery Methods** (Step 3)
   - **Telegram**: Enable and enter your chat ID
   - **Email**: Enable and enter your email address

5. **Activate**
   - Review your settings and create the schedule
   - The schedule will be automatically activated

### 3. Managing Schedules

#### Schedule Actions
- **⚡ Run Now**: Execute the schedule immediately for testing
- **⏸️ Pause/▶️ Play**: Temporarily disable/enable the schedule
- **⚙️ Edit**: Modify schedule settings
- **🗑️ Delete**: Permanently remove the schedule

#### Schedule Status
- **Active**: Schedule is running and will execute at the next scheduled time
- **Paused**: Schedule is temporarily disabled
- **Error**: Last execution failed (check error details)

## Schedule Types Explained

### Daily Schedules
```
Frequency: Daily
Time: 09:00
Result: Runs every day at 9:00 AM
```

### Weekly Schedules
```
Frequency: Weekly
Days: Monday, Wednesday, Friday
Time: 18:00
Result: Runs Mon/Wed/Fri at 6:00 PM
```

### Monthly Schedules
```
Frequency: Monthly
Day: 15
Time: 12:00
Result: Runs on the 15th of each month at noon
```

## Summary Styles

### Executive Summary
- High-level overview
- Key decisions and outcomes
- Strategic insights
- Perfect for leadership updates

### Detailed Analysis
- Comprehensive breakdown
- In-depth explanations
- Context and background
- Ideal for thorough reviews

### Bullet Points
- Concise, scannable format
- Quick highlights
- Easy to digest
- Great for busy schedules

### Action Items Focus
- Task-oriented summaries
- Clear next steps
- Priority assignments
- Perfect for project management

## Focus Areas

### 📋 Tasks & To-dos
- Incomplete tasks
- Action items
- Deadlines and reminders

### 💡 Ideas & Insights
- Creative concepts
- Brainstorming results
- Innovation opportunities

### ✅ Decisions Made
- Choices and resolutions
- Approved plans
- Policy changes

### 🤝 Meeting Notes
- Discussion summaries
- Meeting outcomes
- Follow-up actions

### 📊 Project Updates
- Progress reports
- Milestone achievements
- Status changes

### 📚 Learning & Research
- Study notes
- Research findings
- Knowledge acquisition

## Delivery Channels

### Telegram Integration

#### Setup Requirements
1. **Bot Token**: Configure `VITE_TELEGRAM_BOT_TOKEN` in environment variables
2. **Chat ID**: Get your chat ID by messaging the bot
3. **Permissions**: Ensure the bot can send messages to your chat

#### Message Format
- Rich formatting with MarkdownV2
- Priority indicators (🔴 High, 🟡 Medium, 🟢 Low)
- Reading time estimates
- Structured sections for insights and actions
- Timestamp and source attribution

#### Delivery Features
- Instant delivery
- Message size optimization
- Error handling and retry logic
- Delivery confirmation

### Email Integration (Coming Soon)

#### Planned Features
- Professional HTML formatting
- Attachment support for detailed reports
- Customizable templates
- Delivery scheduling options

## Monitoring & Analytics

### Schedule Statistics
- **Total Schedules**: Number of configured schedules
- **Active Schedules**: Currently running schedules
- **Total Executions**: All-time execution count
- **Success Rate**: Percentage of successful executions
- **Last Execution**: Most recent run timestamp
- **Next Execution**: Upcoming scheduled run

### Execution History
- Individual execution logs
- Success/failure status
- Execution time and performance
- Content processed count
- Delivery results per channel
- Error messages and debugging info

### Performance Metrics
- Average execution time
- Content processing efficiency
- Delivery success rates
- Error frequency and patterns

## Troubleshooting

### Common Issues

#### "No content found for summarization"
- **Cause**: No new content in the specified time window
- **Solution**: Increase content days or check Notion activity

#### "Notion integration not found"
- **Cause**: Notion OAuth connection expired or missing
- **Solution**: Reconnect your Notion workspace

#### "Telegram delivery failed"
- **Cause**: Invalid chat ID or bot configuration
- **Solution**: Verify chat ID and bot token

#### "Schedule execution failed"
- **Cause**: Various issues (API limits, network errors, etc.)
- **Solution**: Check error details and try manual execution

### Debug Steps

1. **Check Prerequisites**
   - Verify all integrations are connected
   - Confirm API keys are configured
   - Test individual components

2. **Manual Execution**
   - Use "Run Now" button to test immediately
   - Review execution results and errors
   - Check delivery status

3. **Review Logs**
   - Check browser console for errors
   - Review execution history
   - Look for patterns in failures

4. **Validate Configuration**
   - Confirm schedule settings
   - Verify delivery method configuration
   - Test with simpler settings

## Best Practices

### Schedule Design
- **Start Simple**: Begin with daily schedules before complex patterns
- **Test First**: Use manual execution to verify before activating
- **Monitor Initially**: Watch first few executions for issues
- **Adjust Gradually**: Fine-tune based on results

### Content Optimization
- **Appropriate Window**: Match content days to your activity level
- **Focus Selection**: Choose relevant focus areas for your workflow
- **Style Matching**: Pick summary style that fits your needs
- **Length Balance**: Consider your reading time and detail needs

### Delivery Strategy
- **Multiple Channels**: Use both Telegram and email for redundancy
- **Timing Consideration**: Schedule for when you'll actually read
- **Frequency Balance**: Avoid overwhelming yourself with too many summaries
- **Quality Over Quantity**: Better to have fewer, high-quality summaries

### Maintenance
- **Regular Review**: Check schedule performance monthly
- **Update Settings**: Adjust based on changing needs
- **Clean Up**: Remove unused or ineffective schedules
- **Monitor Metrics**: Use statistics to optimize performance

## Advanced Features

### Timezone Support
- Automatic timezone detection
- Consistent execution regardless of location
- Daylight saving time handling

### Error Recovery
- Automatic retry logic for transient failures
- Graceful degradation for partial failures
- Comprehensive error logging

### Performance Optimization
- Intelligent content filtering
- Efficient API usage
- Optimized delivery batching

## API Integration (Future)

### Webhook Support
- Real-time execution notifications
- Integration with external systems
- Custom delivery endpoints

### REST API
- Programmatic schedule management
- Bulk operations
- External monitoring integration

## Security & Privacy

### Data Protection
- User-specific data isolation
- Secure credential storage
- Encrypted communication channels

### Access Control
- User-based schedule ownership
- Secure authentication requirements
- Permission-based operations

### Compliance
- GDPR-compliant data handling
- Audit trail maintenance
- Data retention policies

---

## Support

For issues or questions about the scheduling system:

1. **Check this guide** for common solutions
2. **Review execution logs** for specific error details
3. **Test with manual execution** to isolate issues
4. **Contact support** with detailed error information

**Happy Scheduling!** 🚀