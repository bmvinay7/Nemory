/**
 * Cron Job Status and Health Check API
 * Provides detailed status of cron job functionality
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = {
      timestamp: new Date().toISOString(),
      environment: {
        hasGeminiKey: !!process.env.VITE_GOOGLE_AI_API_KEY,
        hasTelegramToken: !!process.env.VITE_TELEGRAM_BOT_TOKEN,
        hasFirebaseConfig: !!process.env.VITE_FIREBASE_PROJECT_ID,
        hasCronSecret: !!process.env.CRON_SECRET,
        nodeEnv: process.env.NODE_ENV || 'unknown'
      },
      services: {},
      schedules: {},
      executions: {}
    };

    // Test Gemini AI API
    try {
      if (process.env.VITE_GOOGLE_AI_API_KEY) {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.VITE_GOOGLE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Test" }] }]
          })
        });
        
        status.services.gemini = {
          status: geminiResponse.ok ? 'working' : 'error',
          statusCode: geminiResponse.status,
          lastTested: new Date().toISOString()
        };
      } else {
        status.services.gemini = { status: 'not_configured' };
      }
    } catch (error) {
      status.services.gemini = { 
        status: 'error', 
        error: error.message,
        lastTested: new Date().toISOString()
      };
    }

    // Test Telegram Bot API
    try {
      if (process.env.VITE_TELEGRAM_BOT_TOKEN) {
        const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.VITE_TELEGRAM_BOT_TOKEN}/getMe`);
        const telegramData = telegramResponse.ok ? await telegramResponse.json() : null;
        
        status.services.telegram = {
          status: telegramResponse.ok ? 'working' : 'error',
          statusCode: telegramResponse.status,
          botInfo: telegramData?.result ? {
            username: telegramData.result.username,
            firstName: telegramData.result.first_name
          } : null,
          lastTested: new Date().toISOString()
        };
      } else {
        status.services.telegram = { status: 'not_configured' };
      }
    } catch (error) {
      status.services.telegram = { 
        status: 'error', 
        error: error.message,
        lastTested: new Date().toISOString()
      };
    }

    // Get schedule statistics
    try {
      const schedulesQuery = query(collection(db, 'schedules'));
      const schedulesSnapshot = await getDocs(schedulesQuery);
      const allSchedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      status.schedules = {
        total: allSchedules.length,
        active: allSchedules.filter(s => s.isActive).length,
        inactive: allSchedules.filter(s => !s.isActive).length,
        byFrequency: {
          daily: allSchedules.filter(s => s.frequency === 'daily').length,
          weekly: allSchedules.filter(s => s.frequency === 'weekly').length,
          monthly: allSchedules.filter(s => s.frequency === 'monthly').length
        }
      };
    } catch (error) {
      status.schedules = { error: error.message };
    }

    // Get recent execution statistics
    try {
      const executionsQuery = query(
        collection(db, 'schedule_executions'),
        orderBy('executedAt', 'desc'),
        limit(10)
      );
      const executionsSnapshot = await getDocs(executionsQuery);
      const recentExecutions = executionsSnapshot.docs.map(doc => doc.data());
      
      status.executions = {
        recentCount: recentExecutions.length,
        lastExecution: recentExecutions[0]?.executedAt?.toDate?.()?.toISOString() || null,
        successRate: recentExecutions.length > 0 ? 
          (recentExecutions.filter(e => e.status === 'success').length / recentExecutions.length * 100).toFixed(1) + '%' : 
          'No data',
        statusBreakdown: {
          success: recentExecutions.filter(e => e.status === 'success').length,
          failed: recentExecutions.filter(e => e.status === 'failed').length,
          running: recentExecutions.filter(e => e.status === 'running').length
        }
      };
    } catch (error) {
      status.executions = { error: error.message };
    }

    // Overall health assessment
    const isHealthy = 
      status.environment.hasGeminiKey &&
      status.environment.hasTelegramToken &&
      status.environment.hasFirebaseConfig &&
      status.services.gemini?.status === 'working' &&
      status.services.telegram?.status === 'working';

    status.overall = {
      health: isHealthy ? 'healthy' : 'degraded',
      readyForProduction: isHealthy && status.environment.hasCronSecret,
      issues: []
    };

    // Identify issues
    if (!status.environment.hasGeminiKey) status.overall.issues.push('Missing Gemini API key');
    if (!status.environment.hasTelegramToken) status.overall.issues.push('Missing Telegram bot token');
    if (!status.environment.hasFirebaseConfig) status.overall.issues.push('Missing Firebase configuration');
    if (!status.environment.hasCronSecret) status.overall.issues.push('Missing CRON_SECRET for security');
    if (status.services.gemini?.status !== 'working') status.overall.issues.push('Gemini AI service not working');
    if (status.services.telegram?.status !== 'working') status.overall.issues.push('Telegram bot service not working');

    res.status(200).json(status);

  } catch (error) {
    console.error('❌ Status check failed:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}