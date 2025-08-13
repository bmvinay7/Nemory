import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork, initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredFields = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 
    'messagingSenderId', 'appId'
  ];
  
  const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missingFields.length > 0) {
    console.error('Firebase: Missing required configuration fields:', missingFields);
    throw new Error(`Firebase configuration incomplete. Missing: ${missingFields.join(', ')}`);
  }
  
  if (import.meta.env.DEV) {
    console.log('Firebase Config Debug:', {
      hasApiKey: !!firebaseConfig.apiKey,
      hasAuthDomain: !!firebaseConfig.authDomain,
      hasProjectId: !!firebaseConfig.projectId,
      projectId: firebaseConfig.projectId,
      hasStorageBucket: !!firebaseConfig.storageBucket,
      hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
      hasAppId: !!firebaseConfig.appId,
      environment: import.meta.env.MODE,
    });
  }
};

// Validate configuration before initializing
validateFirebaseConfig();

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore - use standard getFirestore for better compatibility
export const db = getFirestore(app);

// Connect to emulator if specified
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Firebase: Connected to Firestore emulator');
  } catch (error) {
    console.log('Firebase: Firestore emulator already connected or not available');
  }
}

// Add global error handler for Firestore operations
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.code && event.reason.code.startsWith('firestore/')) {
      console.error('🔥 Firestore Error Detected:', {
        code: event.reason.code,
        message: event.reason.message,
        stack: event.reason.stack
      });
      
      // Provide user-friendly error messages
      if (event.reason.code === 'firestore/permission-denied') {
        console.error('   💡 This is likely a Firestore security rules issue');
      } else if (event.reason.code === 'firestore/unavailable') {
        console.error('   💡 Firestore service is temporarily unavailable');
      } else if (event.reason.message.includes('400')) {
        console.error('   💡 This might be a malformed query or missing index');
      }
    }
  });
}

// Firestore is ready by default with standard getFirestore()
let firestoreReady = true;

// Export utility functions for connection management (simplified)
export const reconnectFirestore = async () => {
  try {
    await enableNetwork(db);
    firestoreReady = true;
    console.log('Firebase: Reconnected to Firestore');
    return true;
  } catch (error) {
    console.error('Firebase: Failed to reconnect:', error);
    return false;
  }
};

export const disconnectFirestore = async () => {
  try {
    await disableNetwork(db);
    firestoreReady = false;
    console.log('Firebase: Disconnected from Firestore');
    return true;
  } catch (error) {
    console.error('Firebase: Failed to disconnect:', error);
    return false;
  }
};

// Only disable network if explicitly requested
if (typeof window !== 'undefined' && import.meta.env.VITE_DISABLE_FIRESTORE_NETWORK === 'true') {
  disableNetwork(db).then(() => {
    firestoreReady = false;
    console.log('Firebase: Network disabled as requested');
  }).catch(() => {
    console.warn('Firebase: Failed to disable network');
  });
} else {
  console.log('Firebase: Using standard Firestore connection');
}

export const isFirestoreReady = () => firestoreReady;

// Utility function to handle Firestore operations with better error reporting
export const handleFirestoreOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    console.error(`🔥 Firestore ${operationName} failed:`, {
      code: error.code,
      message: error.message,
      operationName,
      timestamp: new Date().toISOString()
    });
    
    // Provide specific error context
    if (error.code === 'firestore/permission-denied') {
      console.error(`   💡 Permission denied for ${operationName} - check Firestore rules`);
    } else if (error.code === 'firestore/failed-precondition') {
      console.error(`   💡 Failed precondition for ${operationName} - likely missing index`);
      console.error(`   💡 Run: firebase deploy --only firestore:indexes`);
    } else if (error.message && error.message.includes('400')) {
      console.error(`   💡 HTTP 400 error for ${operationName} - malformed request`);
      console.error(`   💡 Check query parameters and field types`);
    }
    
    throw error;
  }
};

// Initialize Analytics (only in production and when supported)
export const analytics = typeof window !== 'undefined' && import.meta.env.PROD 
  ? getAnalytics(app) 
  : null;

export default app;