// Test script to verify the Notion OAuth serverless function
// Run this with: node test-notion-serverless.js

const testNotionServerlessFunction = async () => {
  console.log('🧪 Testing Notion OAuth Serverless Function...\n');

  // Test 1: Check if function responds to OPTIONS (CORS preflight)
  try {
    console.log('1️⃣ Testing CORS preflight (OPTIONS request)...');
    const optionsResponse = await fetch('http://localhost:8080/api/notion-token', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('   Status:', optionsResponse.status);
    console.log('   CORS Headers:', {
      origin: optionsResponse.headers.get('Access-Control-Allow-Origin'),
      methods: optionsResponse.headers.get('Access-Control-Allow-Methods'),
      headers: optionsResponse.headers.get('Access-Control-Allow-Headers')
    });
    
    if (optionsResponse.status === 200) {
      console.log('   ✅ CORS preflight successful\n');
    } else {
      console.log('   ❌ CORS preflight failed\n');
    }
  } catch (error) {
    console.log('   ❌ CORS test error:', error.message, '\n');
  }

  // Test 2: Check function with missing parameters
  try {
    console.log('2️⃣ Testing validation with missing parameters...');
    const validationResponse = await fetch('http://localhost:8080/api/notion-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    const validationData = await validationResponse.json();
    console.log('   Status:', validationResponse.status);
    console.log('   Response:', validationData);
    
    if (validationResponse.status === 400 && validationData.error === 'invalid_request') {
      console.log('   ✅ Parameter validation working correctly\n');
    } else {
      console.log('   ❌ Parameter validation not working as expected\n');
    }
  } catch (error) {
    console.log('   ❌ Validation test error:', error.message, '\n');
  }

  // Test 3: Check function with invalid credentials (should connect to real API)
  try {
    console.log('3️⃣ Testing with dummy credentials (should fail gracefully)...');
    const dummyResponse = await fetch('http://localhost:8080/api/notion-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'dummy_code_12345',
        redirect_uri: 'http://localhost:8080/auth/notion/callback',
        client_id: 'dummy_client_id',
        client_secret: 'dummy_client_secret'
      })
    });
    
    const dummyData = await dummyResponse.json();
    console.log('   Status:', dummyResponse.status);
    console.log('   Response:', dummyData);
    
    if (dummyResponse.status >= 400 && dummyData.error) {
      console.log('   ✅ Function properly forwards Notion API errors\n');
    } else {
      console.log('   ❌ Function not handling Notion API errors properly\n');
    }
  } catch (error) {
    console.log('   ❌ Dummy credentials test error:', error.message, '\n');
  }

  // Test 4: Check if function is accessible from browser context
  console.log('4️⃣ Environment Check:');
  console.log('   - Make sure you\'re running: npm run dev');
  console.log('   - Server should be at: http://localhost:8080');
  console.log('   - Function endpoint: /api/notion-token');
  console.log('   - Check browser console for any CORS errors when testing\n');

  console.log('🎯 Test Summary:');
  console.log('   - The serverless function should handle CORS properly');
  console.log('   - It should validate required parameters');
  console.log('   - It should forward requests to Notion API');
  console.log('   - All errors should be properly formatted and returned');
  console.log('\n✨ If all tests pass, the Notion OAuth should work in production!');
};

// Run the test
testNotionServerlessFunction().catch(console.error);
