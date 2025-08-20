# ✅ Cron Job Deployment Checklist

## Pre-Deployment Setup

### 1. Generate CRON_SECRET
```bash
openssl rand -base64 32
```
Copy the output: `H9Hx2ir21/1qI4DFoce8Q9TDGPX8mFP6UUz+n3Zgc+g=`

### 2. Add Environment Variable in Vercel
- [ ] Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- [ ] Add `CRON_SECRET` with the generated value
- [ ] Select all environments (Production, Preview, Development)
- [ ] Save the variable

### 3. Verify Required Environment Variables
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_GOOGLE_AI_API_KEY`
- [ ] `VITE_TELEGRAM_BOT_TOKEN`
- [ ] `CRON_SECRET` (newly added)

## Deployment

### 4. Deploy to Vercel
```bash
# Option 1: Using Vercel CLI
vercel --prod

# Option 2: Git push (if using Git integration)
git add .
git commit -m "Add Vercel cron job scheduling system"
git push origin main
```

## Post-Deployment Testing

### 5. Verify Cron Job Registration
- [ ] Go to Vercel Dashboard → Functions
- [ ] Look for `cron-scheduler` function
- [ ] Verify it shows as a cron job (not regular function)

### 6. Test Cron Endpoint
```bash
curl -X GET "https://your-domain.vercel.app/api/cron-scheduler" \
  -H "Authorization: Bearer H9Hx2ir21/1qI4DFoce8Q9TDGPX8mFP6UUz+n3Zgc+g="
```
Expected response: JSON with schedule execution results

### 7. Test Manual Execution
- [ ] Create a test schedule in the app
- [ ] Use "Run Now" button to test manual execution
- [ ] Verify execution appears in Firestore `schedule_executions` collection

### 8. Test Automatic Execution
- [ ] Create a schedule for 2-3 minutes in the future
- [ ] Wait for automatic execution
- [ ] Check Vercel function logs for cron activity
- [ ] Verify execution in Firestore
- [ ] Confirm Telegram delivery (if configured)

## Monitoring Setup

### 9. Monitor Function Logs
- [ ] Bookmark Vercel Dashboard → Functions → cron-scheduler
- [ ] Check logs show regular cron executions every minute
- [ ] Look for successful schedule detections and executions

### 10. Monitor Firestore
- [ ] Check `schedule_executions` collection for new entries
- [ ] Verify execution timestamps and status
- [ ] Monitor success/failure rates

## Success Criteria

### ✅ Deployment Successful When:
- [ ] Cron job appears in Vercel Functions dashboard
- [ ] Manual API test returns 200 status
- [ ] Test schedule executes automatically within 1-2 minutes
- [ ] Execution logged in Firestore with correct data
- [ ] Telegram delivery works (if configured)
- [ ] No errors in Vercel function logs
- [ ] Console shows proper cron job activity

### 📊 Expected Log Output:
```
🕐 Cron job triggered at: 2024-01-15T09:00:00.000Z
📅 Found X active schedules
⏰ Y schedules are due for execution
🚀 Executing schedule: Schedule Name (schedule_id)
📝 Execution logged for schedule with status: success
```

## Troubleshooting

### Common Issues:
- **401 Unauthorized**: Check `CRON_SECRET` is set correctly
- **No schedules found**: Verify Firestore connection and schedule data
- **Notion API errors**: Check user tokens and permissions
- **Telegram failures**: Verify bot token and chat IDs

### Quick Fixes:
1. Redeploy if cron job doesn't appear
2. Check all environment variables are set
3. Test individual components (Notion, Telegram, Firestore)
4. Review Vercel function logs for specific errors

## Rollback Plan

If issues occur:
1. Remove cron configuration from `vercel.json`
2. Redeploy without cron jobs
3. Client-side scheduling will continue as fallback

---

**Ready to go live? Follow this checklist step by step!** 🚀