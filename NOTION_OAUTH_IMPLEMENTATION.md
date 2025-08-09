# Notion OAuth Implementation Guide

## Overview

This document explains how the Notion OAuth integration works in Nemory, focusing on the serverless proxy pattern used to avoid CORS issues in production.

## Architecture

The Notion OAuth integration follows a standard OAuth 2.0 flow with the following components:

1. **Frontend Notion Service** (`src/lib/notion.ts`): Manages the OAuth flow in the browser
2. **Serverless Proxy Function** (`api/notion-token.js`): Handles token exchange with Notion API
3. **Context Provider** (`src/contexts/NotionContext.tsx`): Manages Notion integration state
4. **Callback Handler** (`src/pages/NotionCallback.tsx`): Processes OAuth callback from Notion

## CORS Issue Solution

In production, direct calls from the browser to Notion's API (`api.notion.com`) are blocked due to CORS restrictions. To solve this:

1. All token exchange requests are routed through our serverless function at `/api/notion-token`
2. The serverless function adds proper CORS headers and forwards requests to Notion
3. Responses are passed back to the frontend without CORS issues

## Implementation Details

### Frontend Changes

The `exchangeCodeForToken` method in `src/lib/notion.ts` now:
- Always uses the serverless function for token exchange
- Includes client credentials in the request body
- Has improved error handling with specific error messages

### Serverless Function

The serverless function (`api/notion-token.js`):
- Sets proper CORS headers for cross-origin requests
- Handles OPTIONS preflight requests
- Validates all required parameters
- Forwards the token exchange request to Notion API
- Provides detailed error messages
- Logs useful debugging information

### Vite Configuration

The development proxy in `vite.config.ts` was removed since we now exclusively use the serverless function.

## Testing the Implementation

A test script (`test-notion-serverless.js`) is included to verify the serverless function:

```bash
# Start the dev server
npm run dev

# In another terminal, run the test
node test-notion-serverless.js
```

The test checks:
1. CORS preflight handling
2. Parameter validation
3. Error handling for invalid credentials
4. Overall accessibility

## Troubleshooting

### Common Issues

1. **OAuth token exchange fails with CORS error**
   - Check that you're using the serverless function path (`/api/notion-token`)
   - Verify the function is deployed correctly in production
   - Check browser console for detailed error messages

2. **"Missing required parameters" error**
   - Ensure all required parameters are included in the request
   - Check that client_id and client_secret are being passed correctly

3. **"Invalid grant" error**
   - Authorization code may have expired or been used already
   - Try reconnecting from the beginning of the OAuth flow

4. **Network errors**
   - Check your internet connection
   - Verify the Notion API is accessible
   - Make sure serverless function is deployed correctly

### Debugging

The implementation includes extensive logging:

1. In the browser console (`NotionOAuth:` prefix)
2. In the serverless function logs (check Vercel logs in production)

### Testing in Production

To confirm the implementation works in production:

1. Deploy to Vercel with the updated code
2. Try connecting a Notion workspace
3. Check for CORS errors in the browser console
4. Verify that token exchange succeeds
5. Check Vercel function logs for any errors

## Environment Variables

Make sure these environment variables are set in your Vercel deployment:

```
VITE_NOTION_CLIENT_ID=your_notion_client_id
VITE_NOTION_CLIENT_SECRET=your_notion_client_secret
VITE_NOTION_REDIRECT_URI_PROD=https://yourdomain.com/auth/notion/callback
```

## References

- [Notion API Documentation](https://developers.notion.com/docs/authorization)
- [OAuth 2.0 Authorization Code Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow)
- [CORS and Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions/cors)
