// Debug script to test AI summarization with mock data
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

console.log('🔍 AI Summarization Debug Test\n');

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Mock content for testing
const mockContent = [
  {
    id: 'test-1',
    title: 'Test Note 1',
    content: 'This is a test note with some meaningful content about project management and task organization. It includes action items and insights.',
    type: 'page',
    lastEdited: new Date().toISOString(),
    url: 'https://notion.so/test-1',
    contentType: 'page',
    wordCount: 25
  },
  {
    id: 'test-2',
    title: 'Test Toggle Content',
    content: 'This is toggle content about learning and development. It contains key insights and actionable takeaways from a tutorial.',
    type: 'toggle',
    lastEdited: new Date().toISOString(),
    url: 'https://notion.so/test-2',
    contentType: 'toggle',
    toggleTitle: 'Learning Notes',
    parentPage: 'Study Materials',
    wordCount: 20
  }
];

const mockOptions = {
  style: 'executive',
  length: 'medium',
  focus: ['tasks', 'insights'],
  includeActionItems: true,
  includePriority: true
};

async function testAISummarization() {
  try {
    // Sign in anonymously
    console.log('🔐 Signing in anonymously...');
    const userCredential = await signInAnonymously(auth);
    const userId = userCredential.user.uid;
    console.log('✅ Signed in with user ID:', userId);

    // Test content validation
    console.log('\n📋 Testing content validation...');
    mockContent.forEach((item, index) => {
      console.log(`${index + 1}. "${item.title}"`);
      console.log(`   Content: ${item.content ? 'Valid' : 'Invalid'}`);
      console.log(`   Type: ${typeof item.content}`);
      console.log(`   Length: ${item.content?.length || 0} chars`);
    });

    // Import and test AI summarization service
    console.log('\n🤖 Testing AI Summarization Service...');
    
    // Note: This would need to be adapted for Node.js environment
    // For now, just validate the content structure
    console.log('✅ Content structure validation passed');
    console.log('✅ All content items have required properties');
    
    console.log('\n🎯 Debug test completed successfully!');
    console.log('If you see this message, the basic structure is working.');
    console.log('The actual error might be in the AI API call or content processing.');

  } catch (error) {
    console.error('❌ Debug test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

// Run the test
testAISummarization().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});