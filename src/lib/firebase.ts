import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork, initializeFirestore } from 'firebase/firestore';
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

// Initialize Cloud Firestore with compatibility settings for restrictive environments
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
});

// Initialize Firestore with better error handling
let firestoreReady = false;

const tryEnableNetwork = async () => {
  try {
    await enableNetwork(db);
    firestoreReady = true;
    console.log('Firebase: Firestore connection established');
  } catch (error: any) {
    console.warn('Firebase: Firestore connection failed, using offline mode:', error?.code || error?.message);
    firestoreReady = false;
    try { await disableNetwork(db); } catch {}
  }
};

// Only enable Firestore network in production by default to avoid CORS/noise in dev.
// Override by setting VITE_ENABLE_FIRESTORE_NETWORK=true
const shouldEnableNetwork = typeof window !== 'undefined' && (
  (import.meta.env.PROD && import.meta.env.VITE_DISABLE_FIRESTORE_NETWORK !== 'true') ||
  import.meta.env.VITE_ENABLE_FIRESTORE_NETWORK === 'true'
);

if (shouldEnableNetwork) {
  tryEnableNetwork();
} else {
  // Ensure offline mode in development
  if (typeof window !== 'undefined') {
    disableNetwork(db).catch(() => {});
  }
  firestoreReady = false;
  if (import.meta.env.DEV) {
    console.log('Firebase: Running in offline mode for development (no network listeners).');
  }
}

export const isFirestoreReady = () => firestoreReady;

// Initialize Analytics (only in production and when supported)
export const analytics = typeof window !== 'undefined' && import.meta.env.PROD 
  ? getAnalytics(app) 
  : null;

export default app;