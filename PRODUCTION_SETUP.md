# Production Deployment Guide

## Environment Variables Setup

### 1. Vercel Environment Variables
Add these environment variables in your Vercel dashboard (Settings → Environment Variables):

```bash
# Firebase Configuration (same as development)
VITE_FIREBASE_API_KEY=AIzaSyCbOG_uHTyQLWbbBgn9sbCO9vSmB5Ai1bk
VITE_FIREBASE_AUTH_DOMAIN=nemory-a2543.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=nemory-a2543
VITE_FIREBASE_STORAGE_BUCKET=nemory-a2543.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=630175042324
VITE_FIREBASE_APP_ID=1:630175042324:web:185f552083a0279bc29001
VITE_FIREBASE_MEASUREMENT_ID=G-KEEXWEG11D

# Notion OAuth Configuration
VITE_NOTION_CLIENT_ID=24ad872b-594c-8018-b74f-00370055b5f8
VITE_NOTION_CLIENT_SECRET=secret_1LVSqD7md4PHV1sVOefuaxZ0nEYWrf306NOXybGMaMz
VITE_NOTION_REDIRECT_URI_PROD=https://nemory.vercel.app/auth/notion/callback
```

### 2. Firebase Configuration
- Your Firebase project is already configured for production
- Make sure your domain `nemory.vercel.app` is added to Firebase Auth authorized domains:
  - Go to Firebase Console → Authentication → Settings → Authorized domains
  - Add `nemory.vercel.app`

### 3. Notion OAuth Configuration
- ✅ You've already added `https://nemory.vercel.app/auth/notion/callback` to Notion OAuth redirect URIs
- The app will automatically use the production redirect URI in production environment

### 4. Firestore Security Rules
Your Firestore rules are already configured correctly for production.

## Deployment Steps

1. **Push to GitHub** (already done)
2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Add the environment variables listed above
   - Deploy

3. **Verify Production Setup**:
   - Test Firebase authentication
   - Test Notion OAuth integration
   - Check console for any errors

## Domain Configuration

### Firebase Auth Domains
Add these domains to Firebase Auth:
- `nemory.vercel.app`
- `localhost` (for development)

### Notion OAuth Redirect URIs
Ensure these are configured in your Notion integration:
- `http://localhost:8080/auth/notion/callback` (development)
- `https://nemory.vercel.app/auth/notion/callback` (production)

## Environment Detection
The app automatically detects the environment:
- **Development**: Uses localhost redirect URI and proxy for API calls
- **Production**: Uses production redirect URI and direct API calls

## Troubleshooting

### Firebase Auth Errors
- Ensure all environment variables are set in Vercel
- Check that the domain is authorized in Firebase Auth settings

### Notion OAuth Errors
- Verify redirect URIs match exactly in Notion integration settings
- Check that client ID and secret are correctly set in Vercel environment variables

### CORS Issues
- The app uses direct API calls in production (no proxy needed)
- Ensure Notion API credentials are valid