/**
 * Debug Schedule Execution Issues
 * Specifically targets the "Notion integration not found" error
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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

/**
 * Debug schedule execution issues
 */
async function debugScheduleIssues() {
  console.log('🔍 DEBUGGING SCHEDULE EXECUTION ISSUES');
  console.log('=' .repeat(60));
  
  try {
    // 1. Get all active schedules
    console.log('\n📋 Step 1: Getting all active schedules...');
    const schedulesQuery = query(
      collection(db, 'schedules'),
      where('isActive', '==', true)
    );
    const schedulesSnapshot = await getDocs(schedulesQuery);
    
    if (schedulesSnapshot.empty) {
      console.log('❌ No active schedules found!');
      return;
    }
    
    console.log(`✅ Found ${schedulesSnapshot.size} active schedules`);
    
    // 2. Check each schedule's user integration
    const schedules = [];
    schedulesSnapshot.forEach(doc => {
      const data = doc.data();
      schedules.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        isActive: data.isActive,
        frequency: data.frequency,
        lastRun: data.lastRun,
        nextRun: data.nextRun,
        errorCount: data.errorCount || 0,
        lastError: data.lastError
      });
    });
    
    console.log('\n👥 Step 2: Checking user integrations for each schedule...');
    
    for (const schedule of schedules) {
      console.log(`\n🔍 Checking schedule: "${schedule.name}" (${schedule.id})`);
      console.log(`   👤 User ID: ${schedule.userId}`);
      console.log(`   📅 Frequency: ${schedule.frequency}`);
      console.log(`   ⚡ Last Run: ${schedule.lastRun || 'Never'}`);
      console.log(`   🔄 Next Run: ${schedule.nextRun || 'Not set'}`);
      console.log(`   ❌ Error Count: ${schedule.errorCount}`);
      if (schedule.lastError) {
        console.log(`   🚨 Last Error: ${schedule.lastError}`);
      }
      
      // Check notion_integrations collection
      console.log(`   🔍 Checking notion_integrations...`);
      const notionDoc = await getDoc(doc(db, 'notion_integrations', schedule.userId));
      
      if (notionDoc.exists()) {
        const notionData = notionDoc.data();
        console.log(`   ✅ Found in notion_integrations`);
        console.log(`   🏢 Workspace: ${notionData.workspaceName || 'Unknown'}`);
        console.log(`   🔑 Has Access Token: ${!!notionData.accessToken}`);
        if (notionData.accessToken) {
          console.log(`   📝 Token Preview: ${notionData.accessToken.substring(0, 20)}...`);
        }
      } else {
        console.log(`   ❌ NOT found in notion_integrations`);
        
        // Check users collection as fallback
        console.log(`   🔍 Checking users collection...`);
        const userDoc = await getDoc(doc(db, 'users', schedule.userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`   ✅ Found in users collection`);
          console.log(`   🔑 Has Notion Access Token: ${!!userData.notionAccessToken}`);
          if (userData.notionAccessToken) {
            console.log(`   📝 Token Preview: ${userData.notionAccessToken.substring(0, 20)}...`);
          }
        } else {
          console.log(`   ❌ NOT found in users collection either`);
          console.log(`   🚨 THIS IS THE PROBLEM! User ${schedule.userId} has no integration data.`);
        }
      }
    }
    
    // 3. Check recent execution logs
    console.log('\n📊 Step 3: Checking recent execution logs...');
    try {
      const executionsQuery = query(
        collection(db, 'schedule_executions'),
        orderBy('executedAt', 'desc'),
        limit(10)
      );
      const executionsSnapshot = await getDocs(executionsQuery);
      
      if (executionsSnapshot.empty) {
        console.log('📝 No execution logs found');
      } else {
        console.log(`📝 Found ${executionsSnapshot.size} recent executions:`);
        
        executionsSnapshot.forEach(doc => {
          const data = doc.data();
          const executedAt = data.executedAt.toDate().toISOString();
          console.log(`   ${data.status === 'success' ? '✅' : '❌'} ${executedAt} - ${data.scheduleId} - ${data.status}`);
          if (data.error) {
            console.log(`      Error: ${data.error}`);
          }
        });
      }
    } catch (executionError) {
      console.log('⚠️ Could not fetch execution logs (index may be building)');
    }
    
    // 4. Summary and recommendations
    console.log('\n📋 SUMMARY AND RECOMMENDATIONS');
    console.log('=' .repeat(50));
    
    const schedulesWithIntegrations = schedules.filter(s => s.userId);
    const totalSchedules = schedules.length;
    
    console.log(`📊 Total active schedules: ${totalSchedules}`);
    console.log(`👥 Schedules with user IDs: ${schedulesWithIntegrations.length}`);
    
    if (totalSchedules === 0) {
      console.log('🔧 RECOMMENDATION: Create a test schedule to debug the issue');
    } else if (schedulesWithIntegrations.length === 0) {
      console.log('🔧 RECOMMENDATION: Check schedule creation logic - user IDs are missing');
    } else {
      console.log('🔧 RECOMMENDATION: Check the cron job logs for specific error details');
      console.log('🔧 RECOMMENDATION: Verify that users reconnect their Notion integrations');
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugScheduleIssues();