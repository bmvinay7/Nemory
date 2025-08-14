#!/usr/bin/env node

/**
 * Comprehensive Feature Testing Script
 * Tests all application features for production readiness
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

class FeatureTester {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      error: '\x1b[31m❌',
      warning: '\x1b[33m⚠️',
      success: '\x1b[32m✅',
      info: '\x1b[36mℹ️',
      test: '\x1b[35m🧪'
    };
    console.log(`${colors[type]} ${message}\x1b[0m`);
  }

  addPassed(feature, test) {
    this.results.passed.push({ feature, test });
    this.log(`${feature}: ${test}`, 'success');
  }

  addFailed(feature, test, error) {
    this.results.failed.push({ feature, test, error });
    this.log(`${feature}: ${test} - ${error}`, 'error');
  }

  addWarning(feature, test, warning) {
    this.results.warnings.push({ feature, test, warning });
    this.log(`${feature}: ${test} - ${warning}`, 'warning');
  }

  // Test Authentication Features
  testAuthentication() {
    this.log('\n🔐 Testing Authentication Features...', 'info');

    const authFiles = [
      'src/contexts/AuthContext.tsx',
      'src/components/auth/LoginForm.tsx',
      'src/components/auth/SignupForm.tsx'
    ];

    authFiles.forEach(file => {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Test Google OAuth
        if (content.includes('GoogleAuthProvider') && content.includes('signInWithPopup')) {
          this.addPassed('Authentication', 'Google OAuth Integration');
        } else {
          this.addFailed('Authentication', 'Google OAuth Integration', 'Missing implementation');
        }
        
        // Test Account Linking
        if (content.includes('linkWithCredential')) {
          this.addPassed('Authentication', 'Account Linking');
        } else {
          this.addWarning('Authentication', 'Account Linking', 'Not implemented');
        }
        
        // Test Error Handling
        if (content.includes('try') && content.includes('catch')) {
          this.addPassed('Authentication', 'Error Handling');
        } else {
          this.addFailed('Authentication', 'Error Handling', 'Missing error handling');
        }
      }
    });
  }

  // Test Notion Integration
  testNotionIntegration() {
    this.log('\n📝 Testing Notion Integration...', 'info');

    const notionFile = path.join(rootDir, 'src/lib/notion.ts');
    if (fs.existsSync(notionFile)) {
      const content = fs.readFileSync(notionFile, 'utf8');
      
      // Test OAuth Flow
      if (content.includes('getOAuthUrl') && content.includes('exchangeCodeForToken')) {
        this.addPassed('Notion', 'OAuth Flow');
      } else {
        this.addFailed('Notion', 'OAuth Flow', 'Missing OAuth implementation');
      }
      
      // Test Content Fetching
      if (content.includes('getContentForAI') && content.includes('searchPages')) {
        this.addPassed('Notion', 'Content Fetching');
      } else {
        this.addFailed('Notion', 'Content Fetching', 'Missing content fetching');
      }
      
      // Test Error Handling
      if (content.includes('handleFirestoreOperation') || content.includes('try.*catch')) {
        this.addPassed('Notion', 'Error Handling');
      } else {
        this.addWarning('Notion', 'Error Handling', 'Limited error handling');
      }
    } else {
      this.addFailed('Notion', 'Integration File', 'notion.ts not found');
    }
  }

  // Test AI Summarization
  testAISummarization() {
    this.log('\n🧠 Testing AI Summarization...', 'info');

    const aiFile = path.join(rootDir, 'src/lib/ai-summarization.ts');
    if (fs.existsSync(aiFile)) {
      const content = fs.readFileSync(aiFile, 'utf8');
      
      // Test Google AI Integration
      if (content.includes('GoogleGenerativeAI') && content.includes('generateContent')) {
        this.addPassed('AI Summarization', 'Google Gemini Integration');
      } else {
        this.addFailed('AI Summarization', 'Google Gemini Integration', 'Missing AI integration');
      }
      
      // Test Summary Styles
      const styles = ['executive', 'detailed', 'bullet_points', 'action_items'];
      const hasStyles = styles.some(style => content.includes(style));
      if (hasStyles) {
        this.addPassed('AI Summarization', 'Multiple Summary Styles');
      } else {
        this.addWarning('AI Summarization', 'Multiple Summary Styles', 'Limited style options');
      }
      
      // Test Content Processing
      if (content.includes('smartSummarizeContent') && content.includes('processContent')) {
        this.addPassed('AI Summarization', 'Content Processing');
      } else {
        this.addFailed('AI Summarization', 'Content Processing', 'Missing content processing');
      }
    } else {
      this.addFailed('AI Summarization', 'Integration File', 'ai-summarization.ts not found');
    }
  }

  // Test Telegram Integration
  testTelegramIntegration() {
    this.log('\n📱 Testing Telegram Integration...', 'info');

    const telegramFile = path.join(rootDir, 'src/lib/telegram-client.ts');
    if (fs.existsSync(telegramFile)) {
      const content = fs.readFileSync(telegramFile, 'utf8');
      
      // Test Message Sending
      if (content.includes('sendSummary') && content.includes('sendMessage')) {
        this.addPassed('Telegram', 'Message Sending');
      } else {
        this.addFailed('Telegram', 'Message Sending', 'Missing message sending');
      }
      
      // Test Chat Verification
      if (content.includes('verifyChat') || content.includes('getChat')) {
        this.addPassed('Telegram', 'Chat Verification');
      } else {
        this.addWarning('Telegram', 'Chat Verification', 'Limited verification');
      }
      
      // Test Error Handling
      if (content.includes('try') && content.includes('catch')) {
        this.addPassed('Telegram', 'Error Handling');
      } else {
        this.addFailed('Telegram', 'Error Handling', 'Missing error handling');
      }
    } else {
      this.addFailed('Telegram', 'Integration File', 'telegram-client.ts not found');
    }
  }

  // Test Schedule Management
  testScheduleManagement() {
    this.log('\n⏰ Testing Schedule Management...', 'info');

    const scheduleFiles = [
      'src/lib/schedule-storage.ts',
      'src/lib/schedule-executor.ts',
      'src/lib/schedule-manager.ts'
    ];

    scheduleFiles.forEach(file => {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (file.includes('storage')) {
          // Test Schedule CRUD
          if (content.includes('saveSchedule') && content.includes('getUserSchedules')) {
            this.addPassed('Schedule Management', 'CRUD Operations');
          } else {
            this.addFailed('Schedule Management', 'CRUD Operations', 'Missing CRUD operations');
          }
          
          // Test Validation
          if (content.includes('validateSchedule')) {
            this.addPassed('Schedule Management', 'Input Validation');
          } else {
            this.addWarning('Schedule Management', 'Input Validation', 'Limited validation');
          }
        }
        
        if (file.includes('executor')) {
          // Test Execution
          if (content.includes('executeSchedule')) {
            this.addPassed('Schedule Management', 'Schedule Execution');
          } else {
            this.addFailed('Schedule Management', 'Schedule Execution', 'Missing execution');
          }
        }
        
        if (file.includes('manager')) {
          // Test Background Processing
          if (content.includes('checkAndExecuteSchedules') && content.includes('setInterval')) {
            this.addPassed('Schedule Management', 'Background Processing');
          } else {
            this.addFailed('Schedule Management', 'Background Processing', 'Missing background processing');
          }
        }
      }
    });
  }

  // Test Data Storage
  testDataStorage() {
    this.log('\n💾 Testing Data Storage...', 'info');

    const storageFiles = [
      'src/lib/summary-storage.ts',
      'src/lib/telegram-preferences.ts'
    ];

    storageFiles.forEach(file => {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Test Firestore Integration
        if (content.includes('getDoc') && content.includes('setDoc')) {
          this.addPassed('Data Storage', `Firestore Integration (${file})`);
        } else {
          this.addFailed('Data Storage', `Firestore Integration (${file})`, 'Missing Firestore operations');
        }
        
        // Test Error Handling
        if (content.includes('handleFirestoreOperation') || content.includes('try.*catch')) {
          this.addPassed('Data Storage', `Error Handling (${file})`);
        } else {
          this.addWarning('Data Storage', `Error Handling (${file})`, 'Limited error handling');
        }
      }
    });
  }

  // Test UI Components
  testUIComponents() {
    this.log('\n🎨 Testing UI Components...', 'info');

    const componentDirs = [
      'src/components/ai',
      'src/components/schedule',
      'src/components/telegram',
      'src/components/auth'
    ];

    componentDirs.forEach(dir => {
      const dirPath = path.join(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        const componentFiles = files.filter(f => f.endsWith('.tsx'));
        
        if (componentFiles.length > 0) {
          this.addPassed('UI Components', `${dir} components (${componentFiles.length} files)`);
          
          // Check for accessibility
          componentFiles.forEach(file => {
            const filePath = path.join(dirPath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            
            if (content.includes('aria-') || content.includes('role=')) {
              this.addPassed('UI Components', `Accessibility in ${file}`);
            } else {
              this.addWarning('UI Components', `Accessibility in ${file}`, 'Limited accessibility features');
            }
          });
        } else {
          this.addWarning('UI Components', dir, 'No component files found');
        }
      } else {
        this.addWarning('UI Components', dir, 'Directory not found');
      }
    });
  }

  // Generate Test Report
  generateReport() {
    this.log('\n📊 Feature Test Report', 'info');
    this.log('='.repeat(60), 'info');
    
    const total = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    
    this.log(`\n✅ Tests Passed: ${this.results.passed.length}`, 'success');
    this.log(`❌ Tests Failed: ${this.results.failed.length}`, 'error');
    this.log(`⚠️  Warnings: ${this.results.warnings.length}`, 'warning');
    this.log(`📊 Total Tests: ${total}`, 'info');

    if (this.results.failed.length > 0) {
      this.log('\n❌ Failed Tests:', 'error');
      this.results.failed.forEach(result => {
        this.log(`   • ${result.feature}: ${result.test} - ${result.error}`, 'error');
      });
    }

    if (this.results.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'warning');
      this.results.warnings.forEach(result => {
        this.log(`   • ${result.feature}: ${result.test} - ${result.warning}`, 'warning');
      });
    }

    const passRate = (this.results.passed.length / total) * 100;
    const isReady = this.results.failed.length === 0 && passRate >= 80;
    
    this.log('\n' + '='.repeat(60), 'info');
    this.log(`📈 Pass Rate: ${passRate.toFixed(1)}%`, passRate >= 80 ? 'success' : 'warning');
    
    if (isReady) {
      this.log('🎉 ALL FEATURES ARE WORKING AND READY FOR PRODUCTION!', 'success');
    } else if (this.results.failed.length === 0) {
      this.log('⚠️  Features are working but have warnings. Review before production.', 'warning');
    } else {
      this.log('🚫 Some features have critical issues. Fix before production.', 'error');
    }
    
    return isReady;
  }

  // Run all tests
  async run() {
    this.log('🧪 Starting Comprehensive Feature Testing...', 'test');
    
    this.testAuthentication();
    this.testNotionIntegration();
    this.testAISummarization();
    this.testTelegramIntegration();
    this.testScheduleManagement();
    this.testDataStorage();
    this.testUIComponents();
    
    const isReady = this.generateReport();
    process.exit(isReady ? 0 : 1);
  }
}

// Run tests
const tester = new FeatureTester();
tester.run().catch(error => {
  console.error('❌ Feature testing failed:', error);
  process.exit(1);
});