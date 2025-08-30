/**
 * Comprehensive System Health Check
 * Checks all critical components: Database, Telegram, AI, Cron Jobs
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

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
 * Check Database Health
 */
async function checkDatabaseHealth() {
  console.log('\n🗄️  DATABASE HEALTH CHECK');
  console.log('=' .repeat(50));
  
  const results = {
    firestore: false,
    schedules: 0,
    notionIntegrations: 0,
    users: 0,
    executions: 0
  };
  
  try {
    // Test Firestore connection
    console.log('📡 Testing Firestore connection...');
    const testDoc = await getDoc(doc(db, 'test', 'connection'));
    results.firestore = true;
    console.log('✅ Firestore connection successful');
    
    // Check schedules collection
    console.log('📋 Checking schedules collection...');
    const schedulesQuery = query(collection(db, 'schedules'), limit(10));
    const schedulesSnapshot = await getDocs(schedulesQuery);
    results.schedules = schedulesSnapshot.size;
    console.log(`📊 Found ${results.schedules} schedules`);
    
    // Check notion_integrations collection
    console.log('🔗 Checking notion_integrations collection...');
    const notionQuery = query(collection(db, 'notion_integrations'), limit(10));
    const notionSnapshot = await getDocs(notionQuery);
    results.notionIntegrations = notionSnapshot.size;
    console.log(`📊 Found ${results.notionIntegrations} Notion integrations`);
    
    // Check users collection
    console.log('👥 Checking users collection...');
    const usersQuery = query(collection(db, 'users'), limit(10));
    const usersSnapshot = await getDocs(usersQuery);
    results.users = usersSnapshot.size;
    console.log(`📊 Found ${results.users} users`);
    
    // Check schedule_executions collection
    console.log('⚡ Checking schedule_executions collection...');
    const executionsQuery = query(collection(db, 'schedule_executions'), limit(10));
    const executionsSnapshot = await getDocs(executionsQuery);
    results.executions = executionsSnapshot.size;
    console.log(`📊 Found ${results.executions} executions`);
    
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
  }
  
  return results;
}

/**
 * Check Telegram Integration Health
 */
async function checkTelegramHealth() {
  console.log('\n📱 TELEGRAM HEALTH CHECK');
  console.log('=' .repeat(50));
  
  const results = {
    botToken: false,
    botInfo: null,
    webhookInfo: null
  };
  
  try {
    const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      console.log('❌ Telegram bot token not configured');
      return results;
    }
    
    results.botToken = true;
    console.log('✅ Telegram bot token configured');
    
    // Test bot API
    console.log('🤖 Testing Telegram Bot API...');
    const botResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    
    if (botResponse.ok) {
      const botData = await botResponse.json();
      results.botInfo = botData.result;
      console.log(`✅ Bot API working - Bot: @${botData.result.username}`);
    } else {
      console.log('❌ Bot API test failed');
    }
    
    // Check webhook info
    console.log('🔗 Checking webhook info...');
    const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      results.webhookInfo = webhookData.result;
      console.log(`📡 Webhook URL: ${webhookData.result.url || 'Not set'}`);
      console.log(`📊 Pending updates: ${webhookData.result.pending_update_count || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Telegram health check failed:', error.message);
  }
  
  return results;
}

/**
 * Check AI Integration Health
 */
async function checkAIHealth() {
  console.log('\n🤖 AI INTEGRATION HEALTH CHECK');
  console.log('=' .repeat(50));
  
  const results = {
    apiKey: false,
    geminiPro: false,
    geminiFlash: false
  };
  
  try {
    const apiKey = process.env.VITE_GOOGLE_AI_API_KEY || process.env.VITE_GOOGLE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.log('❌ Google AI API key not configured');
      return results;
    }
    
    results.apiKey = true;
    console.log('✅ Google AI API key configured');
    
    // Test Gemini Pro
    console.log('🧠 Testing Gemini Pro...');
    try {
      const proResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, this is a test.' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });
      
      if (proResponse.ok) {
        results.geminiPro = true;
        console.log('✅ Gemini Pro working');
      } else {
        console.log('❌ Gemini Pro test failed');
      }
    } catch (error) {
      console.log('❌ Gemini Pro error:', error.message);
    }
    
    // Test Gemini Flash
    console.log('⚡ Testing Gemini Flash...');
    try {
      const flashResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello, this is a test.' }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });
      
      if (flashResponse.ok) {
        results.geminiFlash = true;
        console.log('✅ Gemini Flash working');
      } else {
        console.log('❌ Gemini Flash test failed');
      }
    } catch (error) {
      console.log('❌ Gemini Flash error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ AI health check failed:', error.message);
  }
  
  return results;
}

/**
 * Check Environment Configuration
 */
async function checkEnvironmentHealth() {
  console.log('\n⚙️  ENVIRONMENT HEALTH CHECK');
  console.log('=' .repeat(50));
  
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_NOTION_CLIENT_ID',
    'VITE_NOTION_CLIENT_SECRET',
    'VITE_TELEGRAM_BOT_TOKEN',
    'VITE_GOOGLE_AI_API_KEY',
    'CRON_SECRET'
  ];
  
  const results = {
    configured: 0,
    missing: []
  };
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      results.configured++;
      console.log(`✅ ${varName} configured`);
    } else {
      results.missing.push(varName);
      console.log(`❌ ${varName} missing`);
    }
  }
  
  console.log(`📊 Environment: ${results.configured}/${requiredVars.length} variables configured`);
  
  return results;
}

/**
 * Main Health Check
 */
async function runHealthCheck() {
  console.log('🏥 NEMORY SYSTEM HEALTH CHECK');
  console.log('=' .repeat(60));
  console.log(`🕐 Started at: ${new Date().toISOString()}`);
  
  const results = {
    timestamp: new Date().toISOString(),
    database: await checkDatabaseHealth(),
    telegram: await checkTelegramHealth(),
    ai: await checkAIHealth(),
    environment: await checkEnvironmentHealth()
  };
  
  // Summary
  console.log('\n📋 HEALTH CHECK SUMMARY');
  console.log('=' .repeat(50));
  
  console.log(`🗄️  Database: ${results.database.firestore ? '✅' : '❌'} Connected`);
  console.log(`   📊 Schedules: ${results.database.schedules}`);
  console.log(`   🔗 Notion Integrations: ${results.database.notionIntegrations}`);
  console.log(`   👥 Users: ${results.database.users}`);
  console.log(`   ⚡ Executions: ${results.database.executions}`);
  
  console.log(`📱 Telegram: ${results.telegram.botToken ? '✅' : '❌'} Configured`);
  if (results.telegram.botInfo) {
    console.log(`   🤖 Bot: @${results.telegram.botInfo.username}`);
  }
  
  console.log(`🤖 AI: ${results.ai.apiKey ? '✅' : '❌'} Configured`);
  console.log(`   🧠 Gemini Pro: ${results.ai.geminiPro ? '✅' : '❌'}`);
  console.log(`   ⚡ Gemini Flash: ${results.ai.geminiFlash ? '✅' : '❌'}`);
  
  console.log(`⚙️  Environment: ${results.environment.configured}/${results.environment.configured + results.environment.missing.length} variables`);
  
  if (results.environment.missing.length > 0) {
    console.log(`   ❌ Missing: ${results.environment.missing.join(', ')}`);
  }
  
  console.log('\n✅ Health check complete!');
  
  return results;
}

// Run the health check
runHealthCheck().catch(error => {
  console.error('❌ Health check failed:', error);
});