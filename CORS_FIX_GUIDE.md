# 🚨 CORS Error Fix Guide

## The Error You're Seeing:
```
Fetch API cannot load https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?...
due to access control checks.
```

## 🔧 IMMEDIATE FIXES (Choose One):

### Option 1: Add Localhost to Firebase (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `nemory-a2543`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Add: `localhost`
6. Save changes

### Option 2: Use Different Port
If localhost is already added, try a different port:
```bash
npm run dev -- --port 3000
```
Then access: `http://localhost:3000`

### Option 3: Use Firebase Auth Domain
Access your app using your Firebase auth domain:
```
https://nemory-a2543.firebaseapp.com
```

## 🔍 DIAGNOSTIC COMMANDS

Run these in your browser console to diagnose the issue:

```javascript
// Check Firebase configuration
window.firebaseDiagnostics.checkFirebaseConnection()

// Get detailed CORS fix recommendations
window.firebaseDiagnostics.fixCORSIssues()
```

## 🛠️ PERMANENT SOLUTION

### For Development:
1. **Add to Firebase Authorized Domains:**
   - `localhost`
   - `127.0.0.1`
   - `localhost:8080`

### For Production:
1. **Add your production domain:**
   - `yourdomain.com`
   - `www.yourdomain.com`
   - `your-app.vercel.app`

## 🚨 EMERGENCY WORKAROUND

If you need to test immediately, temporarily disable Firestore and use localStorage:

```javascript
// In browser console
localStorage.setItem('DISABLE_FIRESTORE', 'true')
// Refresh page
```

To re-enable:
```javascript
localStorage.removeItem('DISABLE_FIRESTORE')
// Refresh page
```

## 📋 VERIFICATION STEPS

After applying fixes:

1. **Clear browser cache** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Check browser console** for Firebase connection logs
3. **Test authentication** (login/logout)
4. **Test Firestore operations** (create/read schedules)

## 🔍 TROUBLESHOOTING

### If CORS error persists:

1. **Check Firebase project ID** in console logs
2. **Verify environment variables** are loaded correctly
3. **Ensure HTTPS** in production (not HTTP)
4. **Check browser network tab** for failed requests
5. **Try incognito mode** to rule out browser extensions

### Common Causes:
- Domain not added to Firebase authorized domains
- Wrong Firebase project configuration
- Browser blocking third-party cookies
- Firestore emulator misconfiguration
- Network/firewall blocking Firebase domains

## 🎯 QUICK TEST

Run this in browser console to test Firebase connection:
```javascript
// Test Firebase connection
fetch('https://firestore.googleapis.com/v1/projects/nemory-a2543/databases/(default)/documents')
  .then(r => console.log('✅ Firebase reachable:', r.status))
  .catch(e => console.log('❌ Firebase blocked:', e.message))
```

---

**Most likely fix: Add `localhost` to Firebase Console → Authentication → Settings → Authorized domains**