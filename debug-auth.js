// Debug script to test Firebase authentication and permissions
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('🔍 Firebase Auth & Permissions Debug\n');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log('Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: !!firebaseConfig.apiKey,
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('✅ User authenticated:', {
      uid: user.uid,
      email: user.email,
      isAnonymous: user.isAnonymous,
    });

    // Test reading userMetrics
    try {
      console.log('\n📊 Testing userMetrics access...');
      const metricsRef = doc(db, 'userMetrics', user.uid);
      const metricsSnap = await getDoc(metricsRef);
      
      if (metricsSnap.exists()) {
        console.log('✅ Successfully read userMetrics:', metricsSnap.data());
      } else {
        console.log('📝 No userMetrics document, creating one...');
        await setDoc(metricsRef, {
          notesProcessed: 0,
          summariesSent: 0,
          actionItems: 0,
          lastUpdated: new Date()
        });
        console.log('✅ Successfully created userMetrics document');
      }
    } catch (error) {
      console.error('❌ Error with userMetrics:', error.code, error.message);
    }

    // Test reading telegramPreferences
    try {
      console.log('\n📱 Testing telegramPreferences access...');
      const telegramRef = doc(db, 'telegramPreferences', user.uid);
      const telegramSnap = await getDoc(telegramRef);
      
      if (telegramSnap.exists()) {
        console.log('✅ Successfully read telegramPreferences:', telegramSnap.data());
      } else {
        console.log('📝 No telegramPreferences document found (this is normal)');
      }
    } catch (error) {
      console.error('❌ Error with telegramPreferences:', error.code, error.message);
    }

    process.exit(0);
  } else {
    console.log('🔐 No user authenticated, signing in anonymously...');
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('❌ Anonymous sign-in failed:', error.code, error.message);
      process.exit(1);
    }
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Debug timeout reached');
  process.exit(1);
}, 10000);