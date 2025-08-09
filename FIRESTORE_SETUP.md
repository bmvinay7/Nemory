# Firestore Database Setup

The 400 errors you're seeing are likely because the Firestore database hasn't been created yet. Here's how to set it up:

## 1. Go to Firebase Console
- Visit [Firebase Console](https://console.firebase.google.com/)
- Select your project: `nemory-a2543`

## 2. Create Firestore Database
1. In the left sidebar, click on **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select a location (choose the closest to your users)
5. Click **"Done"**

## 3. Set Up Security Rules (Important!)
Once the database is created, go to the **"Rules"** tab and replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own notion integrations
    match /notion_integrations/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read/write their own user data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## 4. Publish the Rules
Click **"Publish"** to save the security rules.

## 5. Test the Connection
After setting up Firestore:
1. Restart your development server: `npm run dev`
2. Sign in to your app
3. Go to the dashboard
4. The Notion integration should now load properly

## Troubleshooting
If you still see errors:
1. Check the browser console for detailed error messages
2. Verify your Firebase project ID in the `.env` file matches your actual project
3. Make sure you're signed in to the app
4. Try clearing your browser cache and localStorage

The app now has a localStorage fallback, so it should work even if Firestore isn't set up yet, but for production you'll need Firestore properly configured.