/**
 * Debug script to check user lookup issues
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

async function debugUserLookup() {
  try {
    console.log('🔍 Debug: Checking user lookup issues...');
    
    // First, let's get all schedules to see what user IDs are stored
    console.log('\n📋 Checking all schedules...');
    const schedulesQuery = query(collection(db, 'schedules'));
    const schedulesSnapshot = await getDocs(schedulesQuery);
    
    const schedules = [];
    schedulesSnapshot.forEach((doc) => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        isActive: data.isActive
      });
    });
    
    console.log(`Found ${schedules.length} schedules:`);
    schedules.forEach(schedule => {
      console.log(`  - ${schedule.name} (${schedule.id}) - User: ${schedule.userId} - Active: ${schedule.isActive}`);
    });
    
    // Now check each user ID in both collections
    const uniqueUserIds = [...new Set(schedules.map(s => s.userId))];
    console.log(`\n👥 Found ${uniqueUserIds.length} unique user IDs`);
    
    for (const userId of uniqueUserIds) {
      console.log(`\n🔍 Checking user: ${userId}`);
      
      // Check users collection
      console.log('  📁 Checking users collection...');
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('  ✅ Found in users collection');
        console.log('  📝 Has notionAccessToken:', !!userData.notionAccessToken);
        if (userData.notionAccessToken) {
          console.log('  🔑 Token preview:', userData.notionAccessToken.substring(0, 20) + '...');
        }
      } else {
        console.log('  ❌ NOT found in users collection');
      }
      
      // Check notion_integrations collection
      console.log('  📁 Checking notion_integrations collection...');
      const notionDoc = await getDoc(doc(db, 'notion_integrations', userId));
      if (notionDoc.exists()) {
        const notionData = notionDoc.data();
        console.log('  ✅ Found in notion_integrations collection');
        console.log('  📝 Has accessToken:', !!notionData.accessToken);
        if (notionData.accessToken) {
          console.log('  🔑 Token preview:', notionData.accessToken.substring(0, 20) + '...');
        }
        console.log('  🏢 Workspace:', notionData.workspaceName);
      } else {
        console.log('  ❌ NOT found in notion_integrations collection');
      }
    }
    
    console.log('\n✅ Debug complete');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugUserLookup();