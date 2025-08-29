
// Nemory Comprehensive Browser Testing Script
// Copy and paste this into your browser console after starting the app

console.log('🧪 Starting Nemory Comprehensive Testing...');

// Test Results Storage
window.testResults = {
  passed: [],
  failed: [],
  pending: []
};

// Helper Functions
function testPassed(testName) {
  window.testResults.passed.push(testName);
  console.log('✅', testName, 'PASSED');
}

function testFailed(testName, error) {
  window.testResults.failed.push({test: testName, error});
  console.log('❌', testName, 'FAILED:', error);
}

function testPending(testName) {
  window.testResults.pending.push(testName);
  console.log('⏳', testName, 'PENDING');
}

// 1. AUTHENTICATION TESTS
console.log('\n🔐 Testing Authentication...');

async function testAuthentication() {
  try {
    // Check if auth context is available
    if (typeof window.firebase !== 'undefined') {
      testPassed('Firebase SDK loaded');
    } else {
      testFailed('Firebase SDK', 'Not loaded');
    }

    // Check auth state
    const authState = localStorage.getItem('firebase:authUser:' + 
      (import.meta?.env?.VITE_FIREBASE_API_KEY || 'unknown'));
    
    if (authState) {
      testPassed('User authentication state exists');
    } else {
      testPending('User authentication - Please log in manually');
    }

    // Test Google OAuth button
    const googleButton = document.querySelector('[data-testid="google-login"], button:contains("Google")');
    if (googleButton) {
      testPassed('Google OAuth button present');
    } else {
      testFailed('Google OAuth button', 'Not found in DOM');
    }

  } catch (error) {
    testFailed('Authentication test', error.message);
  }
}

// 2. NOTION INTEGRATION TESTS
console.log('\n📝 Testing Notion Integration...');

async function testNotionIntegration() {
  try {
    // Check if Notion context is available
    const notionButton = document.querySelector('[data-testid="notion-connect"], button:contains("Notion")');
    if (notionButton) {
      testPassed('Notion connect button present');
    } else {
      testFailed('Notion connect button', 'Not found in DOM');
    }

    // Test Notion OAuth URL generation
    try {
      // This would need to be tested by clicking the button
      testPending('Notion OAuth flow - Manual test required');
    } catch (error) {
      testFailed('Notion OAuth', error.message);
    }

  } catch (error) {
    testFailed('Notion integration test', error.message);
  }
}

// 3. AI SUMMARIZATION TESTS
console.log('\n🧠 Testing AI Summarization...');

async function testAISummarization() {
  try {
    // Check if AI summarization components are present
    const summaryButton = document.querySelector('[data-testid="generate-summary"], button:contains("Generate")');
    if (summaryButton) {
      testPassed('AI summarization button present');
    } else {
      testFailed('AI summarization button', 'Not found in DOM');
    }

    // Test summary options
    const styleSelect = document.querySelector('select[name="style"], [data-testid="summary-style"]');
    if (styleSelect) {
      testPassed('Summary style selector present');
    } else {
      testFailed('Summary style selector', 'Not found in DOM');
    }

    testPending('AI summarization execution - Manual test required');

  } catch (error) {
    testFailed('AI summarization test', error.message);
  }
}

// 4. TELEGRAM INTEGRATION TESTS
console.log('\n📱 Testing Telegram Integration...');

async function testTelegramIntegration() {
  try {
    // Check Telegram settings
    const telegramSettings = document.querySelector('[data-testid="telegram-settings"], input[placeholder*="chat"]');
    if (telegramSettings) {
      testPassed('Telegram settings present');
    } else {
      testFailed('Telegram settings', 'Not found in DOM');
    }

    // Test chat ID validation
    const chatIdInput = document.querySelector('input[placeholder*="chat"], input[name="chatId"]');
    if (chatIdInput) {
      testPassed('Chat ID input present');
      
      // Test validation
      chatIdInput.value = 'invalid';
      chatIdInput.dispatchEvent(new Event('change'));
      
      setTimeout(() => {
        const errorMessage = document.querySelector('.error, [role="alert"]');
        if (errorMessage) {
          testPassed('Chat ID validation working');
        } else {
          testFailed('Chat ID validation', 'No error shown for invalid input');
        }
      }, 100);
    } else {
      testFailed('Chat ID input', 'Not found in DOM');
    }

    testPending('Telegram message sending - Manual test required');

  } catch (error) {
    testFailed('Telegram integration test', error.message);
  }
}

// 5. SCHEDULE MANAGEMENT TESTS
console.log('\n⏰ Testing Schedule Management...');

async function testScheduleManagement() {
  try {
    // Check schedule creation
    const createScheduleButton = document.querySelector('[data-testid="create-schedule"], button:contains("Create Schedule")');
    if (createScheduleButton) {
      testPassed('Create schedule button present');
    } else {
      testFailed('Create schedule button', 'Not found in DOM');
    }

    // Test schedule form
    const scheduleForm = document.querySelector('form[data-testid="schedule-form"], form:has(input[name="name"])');
    if (scheduleForm) {
      testPassed('Schedule form present');
    } else {
      testFailed('Schedule form', 'Not found in DOM');
    }

    // Test frequency options
    const frequencySelect = document.querySelector('select[name="frequency"], [data-testid="frequency-select"]');
    if (frequencySelect) {
      testPassed('Frequency selector present');
    } else {
      testFailed('Frequency selector', 'Not found in DOM');
    }

    testPending('Schedule execution - Manual test required');

  } catch (error) {
    testFailed('Schedule management test', error.message);
  }
}

// 6. DATA STORAGE TESTS
console.log('\n💾 Testing Data Storage...');

async function testDataStorage() {
  try {
    // Test localStorage
    localStorage.setItem('test_key', 'test_value');
    if (localStorage.getItem('test_key') === 'test_value') {
      testPassed('localStorage working');
      localStorage.removeItem('test_key');
    } else {
      testFailed('localStorage', 'Not working properly');
    }

    // Test Firestore connection (if available)
    if (window.firebase && window.firebase.firestore) {
      testPassed('Firestore SDK available');
    } else {
      testFailed('Firestore SDK', 'Not available');
    }

    testPending('Firestore operations - Manual test required');

  } catch (error) {
    testFailed('Data storage test', error.message);
  }
}

// 7. UI/UX TESTS
console.log('\n🎨 Testing UI/UX...');

async function testUIUX() {
  try {
    // Test responsive design
    const viewport = window.innerWidth;
    if (viewport < 768) {
      testPassed('Mobile viewport detected');
    } else if (viewport < 1024) {
      testPassed('Tablet viewport detected');
    } else {
      testPassed('Desktop viewport detected');
    }

    // Test navigation
    const navigation = document.querySelector('nav, [role="navigation"]');
    if (navigation) {
      testPassed('Navigation present');
    } else {
      testFailed('Navigation', 'Not found in DOM');
    }

    // Test accessibility
    const skipLink = document.querySelector('[href="#main"], .skip-link');
    if (skipLink) {
      testPassed('Skip link present');
    } else {
      testFailed('Skip link', 'Not found - accessibility issue');
    }

    // Test loading states
    const loadingIndicators = document.querySelectorAll('.loading, .spinner, [role="progressbar"]');
    if (loadingIndicators.length > 0) {
      testPassed('Loading indicators present');
    } else {
      testFailed('Loading indicators', 'Not found');
    }

  } catch (error) {
    testFailed('UI/UX test', error.message);
  }
}

// 8. PERFORMANCE TESTS
console.log('\n⚡ Testing Performance...');

async function testPerformance() {
  try {
    // Test page load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    if (loadTime < 3000) {
      testPassed(`Page load time: ${loadTime}ms (< 3s)`);
    } else {
      testFailed('Page load time', `${loadTime}ms (> 3s)`);
    }

    // Test bundle size (approximate)
    const scripts = document.querySelectorAll('script[src]');
    testPassed(`JavaScript bundles loaded: ${scripts.length}`);

    // Test memory usage
    if (performance.memory) {
      const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
      if (memoryMB < 50) {
        testPassed(`Memory usage: ${memoryMB}MB (< 50MB)`);
      } else {
        testFailed('Memory usage', `${memoryMB}MB (> 50MB)`);
      }
    }

  } catch (error) {
    testFailed('Performance test', error.message);
  }
}

// 9. ERROR HANDLING TESTS
console.log('\n🚨 Testing Error Handling...');

async function testErrorHandling() {
  try {
    // Test network error simulation
    const originalFetch = window.fetch;
    window.fetch = () => Promise.reject(new Error('Network error'));
    
    // Restore fetch after test
    setTimeout(() => {
      window.fetch = originalFetch;
      testPassed('Network error simulation completed');
    }, 1000);

    // Test error boundaries
    const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
    if (errorBoundaries.length > 0) {
      testPassed('Error boundaries present');
    } else {
      testFailed('Error boundaries', 'Not found');
    }

  } catch (error) {
    testFailed('Error handling test', error.message);
  }
}

// RUN ALL TESTS
async function runAllTests() {
  console.log('🚀 Running all tests...');
  
  await testAuthentication();
  await testNotionIntegration();
  await testAISummarization();
  await testTelegramIntegration();
  await testScheduleManagement();
  await testDataStorage();
  await testUIUX();
  await testPerformance();
  await testErrorHandling();

  // Generate report
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`✅ Passed: ${window.testResults.passed.length}`);
  console.log(`❌ Failed: ${window.testResults.failed.length}`);
  console.log(`⏳ Pending: ${window.testResults.pending.length}`);

  if (window.testResults.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    window.testResults.failed.forEach(failure => {
      console.log(`   • ${failure.test}: ${failure.error}`);
    });
  }

  if (window.testResults.pending.length > 0) {
    console.log('\n⏳ MANUAL TESTS REQUIRED:');
    window.testResults.pending.forEach(test => {
      console.log(`   • ${test}`);
    });
  }

  const passRate = (window.testResults.passed.length / 
    (window.testResults.passed.length + window.testResults.failed.length)) * 100;
  
  console.log(`\n📈 Pass Rate: ${passRate.toFixed(1)}%`);
  
  if (passRate >= 90) {
    console.log('🎉 EXCELLENT! Ready for production.');
  } else if (passRate >= 75) {
    console.log('⚠️  GOOD. Fix failed tests before production.');
  } else {
    console.log('🚫 NEEDS WORK. Multiple issues to fix.');
  }
}

// Auto-run tests
runAllTests();

// Export results for external access
window.getTestResults = () => window.testResults;
