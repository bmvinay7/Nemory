# Notion OAuth Setup Guide

## Current Issue: "Missing or Invalid Redirect URL"

This error occurs when the redirect URI sent to Notion doesn't match what's configured in your Notion integration.

## Root Cause Analysis

The app now dynamically constructs the redirect URI based on the current domain:
- **Development**: `http://localhost:8080/auth/notion/callback`
- **Production**: `https://nemory.vercel.app/auth/notion/callback`

## Fix: Update Notion Integration Settings

### 1. Go to Notion Developers Console
- Visit: https://www.notion.so/my-integrations
- Find your integration: `Nemory` (Client ID: 24ad872b-594c-8018-b74f-00370055b5f8)

### 2. Update Redirect URIs
Make sure these **exact** URLs are configured:

```
http://localhost:8080/auth/notion/callback
https://nemory.vercel.app/auth/notion/callback
```

### 3. Important Notes
- URLs must match **exactly** (including protocol, domain, port, and path)
- No trailing slashes
- Case sensitive
- Must include both development and production URLs

### 4. Verification Steps
After updating the Notion integration:

1. **Check Development**:
   - Run app locally: `npm run dev`
   - Try connecting to Notion
   - Should work on `http://localhost:8080`

2. **Check Production**:
   - Deploy to Vercel
   - Try connecting to Notion
   - Should work on `https://nemory.vercel.app`

## Debugging Information

The app now logs detailed information about redirect URIs. Check browser console for:
```
NotionOAuth Environment Debug: {
  currentOrigin: "https://nemory.vercel.app",
  redirectUri: "https://nemory.vercel.app/auth/notion/callback",
  ...
}
```

## Common Issues

### Issue 1: Wrong Domain
- **Problem**: Notion integration configured for different domain
- **Solution**: Update redirect URIs in Notion integration

### Issue 2: Missing HTTPS
- **Problem**: Production URL not using HTTPS
- **Solution**: Ensure Vercel deployment uses HTTPS (automatic)

### Issue 3: Port Mismatch
- **Problem**: Development server running on different port
- **Solution**: Start dev server with `npm run dev` (uses port 8080)

## Testing Checklist

- [ ] Notion integration has both redirect URIs configured
- [ ] Development works on `localhost:8080`
- [ ] Production works on `nemory.vercel.app`
- [ ] Console shows correct redirect URI being used
- [ ] No "invalid redirect URL" errors

## Next Steps

1. Update Notion integration redirect URIs
2. Redeploy to Vercel (if needed)
3. Test OAuth flow in production
4. Check console logs for any remaining issues