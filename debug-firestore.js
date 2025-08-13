// Debug script to test Firestore connection and queries
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('🔍 Firestore Connection Debug Test\n');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testFirestoreConnection() {
  try {
    // Sign in anonymously
    console.log('🔐 Signing in anonymously...');
    const userCredential = await signInAnonymously(auth);
    const userId = userCredential.user.uid;
    console.log('✅ Signed in with user ID:', userId);

    // Test 1: Write a test document
    console.log('\n📝 Testing document write...');
    const testDocRef = doc(db, 'test', 'connection-test');
    await setDoc(testDocRef, {
      message: 'Firestore connection test',
      timestamp: Timestamp.now(),
      userId: userId
    });
    console.log('✅ Test document written successfully');

    // Test 2: Read the test document
    console.log('\n📖 Testing document read...');
    const testDocSnap = await getDoc(testDocRef);
    if (testDocSnap.exists()) {
      console.log('✅ Test document read successfully:', testDocSnap.data());
    } else {
      console.log('❌ Test document not found');
    }

    // Test 3: Test userMetrics collection
    console.log('\n📊 Testing userMetrics collection...');
    const metricsRef = doc(db, 'userMetrics', userId);
    await setDoc(metricsRef, {
      notesProcessed: 0,
      summariesSent: 0,
      actionItems: 0,
      lastUpdated: Timestamp.now()
    });
    console.log('✅ UserMetrics document created successfully');

    // Test 4: Test telegramPreferences collection
    console.log('\n📱 Testing telegramPreferences collection...');
    const telegramRef = doc(db, 'telegramPreferences', userId);
    await setDoc(telegramRef, {
      chatId: 'test-chat-id',
      isVerified: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    console.log('✅ TelegramPreferences document created successfully');

    // Test 5: Test summaries collection query
    console.log('\n📋 Testing summaries collection query...');
    try {
      const summariesQuery = query(
        collection(db, 'summaries'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(summariesQuery);
      console.log(`✅ Summaries query successful, found ${querySnapshot.size} documents`);
    } catch (queryError) {
      console.error('❌ Summaries query failed:', queryError.code, queryError.message);
    }

    console.log('\n🎯 Firestore connection test completed successfully!');
    console.log('All basic operations are working correctly.');

  } catch (error) {
    console.error('❌ Firestore test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

// Run the test
testFirestoreConnection().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});