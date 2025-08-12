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

// Initialize Cloud Firestore - use standard getFirestore to avoid CORS issues
export const db = import.meta.env.DEV && import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true'
  ? (() => {
      const firestore = getFirestore(app);
      try {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
        console.log('Firebase: Connected to Firestore emulator');
      } catch (error) {
        console.log('Firebase: Firestore emulator already connected or not available');
      }
      return firestore;
    })()
  : getFirestore(app);

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

// Initialize Analytics (only in production and when supported)
export const analytics = typeof window !== 'undefined' && import.meta.env.PROD 
  ? getAnalytics(app) 
  : null;

export default app;