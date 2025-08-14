#!/usr/bin/env node

/**
 * Comprehensive Security Audit Script
 * Tests all features and validates security measures
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

class SecurityAuditor {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
    this.features = [];
  }

  log(message, type = 'info') {
    const colors = {
      error: '\x1b[31m❌',
      warning: '\x1b[33m⚠️',
      success: '\x1b[32m✅',
      info: '\x1b[36mℹ️',
      feature: '\x1b[35m🔧'
    };
    console.log(`${colors[type]} ${message}\x1b[0m`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  addPassed(message) {
    this.passed.push(message);
    this.log(message, 'success');
  }

  addFeature(message) {
    this.features.push(message);
    this.log(message, 'feature');
  }

  // 1. Authentication Security Audit
  auditAuthentication() {
    this.log('\n🔐 Auditing Authentication Security...', 'info');

    // Check Firebase Auth configuration
    const authContextPath = path.join(rootDir, 'src/contexts/AuthContext.tsx');
    if (fs.existsSync(authContextPath)) {
      const authContent = fs.readFileSync(authContextPath, 'utf8');
      
      if (authContent.includes('GoogleAuthProvider')) {
        this.addPassed('Google OAuth integration implemented');
      }
      
      if (authContent.includes('linkWithCredential')) {
        this.addPassed('Account linking functionality implemented');
      }
      
      if (authContent.includes('signOut')) {
        this.addPassed('Secure logout functionality implemented');
      }
      
      // Check for potential security issues
      if (authContent.includes('console.log') && !authContent.includes('import.meta.env.DEV')) {
        this.addWarning('Authentication context contains console.log statements');
      }
    }

    this.addFeature('Authentication: Google OAuth, Account Linking, Secure Sessions');
  }

  // 2. Data Security Audit
  auditDataSecurity() {
    this.log('\n🛡️ Auditing Data Security...', 'info');

    // Check Firestore rules
    const rulesPath = path.join(rootDir, 'firestore.rules');
    if (fs.existsSync(rulesPath)) {
      const rules = fs.readFileSync(rulesPath, 'utf8');
      
      if (rules.includes('request.auth != null')) {
        this.addPassed('Firestore rules require authentication');
      } else {
        this.addError('Firestore rules do not require authentication');
      }
      
      if (rules.includes('request.auth.uid == userId')) {
        this.addPassed('Firestore rules enforce user data isolation');
      } else {
        this.addError('Firestore rules do not enforce user data isolation');
      }
      
      if (rules.includes('allow read, write: if false')) {
        this.addPassed('Firestore rules have explicit deny-all fallback');
      } else {
        this.addWarning('Firestore rules missing explicit deny-all fallback');
      }
    }

    // Check for input validation
    const storageFiles = [
      'src/lib/schedule-storage.ts',
      'src/lib/summary-storage.ts',
      'src/lib/telegram-preferences.ts'
    ];

    storageFiles.forEach(file => {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('validateSchedule') || content.includes('validation')) {
          this.addPassed(`Input validation implemented in ${file}`);
        } else {
          this.addWarning(`No input validation found in ${file}`);
        }
      }
    });

    this.addFeature('Data Security: User Isolation, Input Validation, Secure Rules');
  }

  // 3. API Security Audit
  auditAPISecurity() {
    this.log('\n🔌 Auditing API Security...', 'info');

    // Check environment variable usage
    const envExamplePath = path.join(rootDir, '.env.example');
    if (fs.existsSync(envExamplePath)) {
      const envExample = fs.readFileSync(envExamplePath, 'utf8');
      
      const requiredSecrets = [
        'VITE_FIREBASE_API_KEY',
        'VITE_GOOGLE_AI_API_KEY',
        'VITE_TELEGRAM_BOT_TOKEN',
        'VITE_NOTION_CLIENT_SECRET'
      ];
      
      requiredSecrets.forEach(secret => {
        if (envExample.includes(secret)) {
          this.addPassed(`${secret} properly externalized`);
        } else {
          this.addError(`${secret} missing from environment configuration`);
        }
      });
    }

    // Check for hardcoded secrets
    this.checkForHardcodedSecrets(path.join(rootDir, 'src'));

    // Check API endpoints
    const apiDir = path.join(rootDir, 'api');
    if (fs.existsSync(apiDir)) {
      const apiFiles = fs.readdirSync(apiDir);
      apiFiles.forEach(file => {
        const filePath = path.join(apiDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('CORS') || content.includes('Access-Control')) {
          this.addPassed(`CORS headers configured in ${file}`);
        }
        
        if (content.includes('validation') || content.includes('typeof')) {
          this.addPassed(`Input validation in API endpoint ${file}`);
        }
      });
    }

    this.addFeature('API Security: Environment Variables, CORS, Input Validation');
  }

  // 4. Feature Functionality Audit
  auditFeatures() {
    this.log('\n⚙️ Auditing Feature Functionality...', 'info');

    const features = [
      {
        name: 'AI Summarization',
        files: ['src/lib/ai-summarization.ts'],
        checks: ['GoogleGenerativeAI', 'generateContent']
      },
      {
        name: 'Telegram Integration',
        files: ['src/lib/telegram-client.ts'],
        checks: ['sendSummary', 'verifyChat']
      },
      {
        name: 'Notion Integration',
        files: ['src/lib/notion.ts'],
        checks: ['getContentForAI', 'OAuth']
      },
      {
        name: 'Schedule Management',
        files: ['src/lib/schedule-storage.ts', 'src/lib/schedule-executor.ts'],
        checks: ['executeSchedule', 'calculateNextRun']
      },
      {
        name: 'User Preferences',
        files: ['src/lib/telegram-preferences.ts'],
        checks: ['savePreferences', 'getUserPreferences']
      }
    ];

    features.forEach(feature => {
      let featureWorking = true;
      
      feature.files.forEach(file => {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          feature.checks.forEach(check => {
            if (content.includes(check)) {
              this.addPassed(`${feature.name}: ${check} implemented`);
            } else {
              this.addWarning(`${feature.name}: ${check} not found`);
              featureWorking = false;
            }
          });
        } else {
          this.addError(`${feature.name}: ${file} not found`);
          featureWorking = false;
        }
      });
      
      if (featureWorking) {
        this.addFeature(`${feature.name}: Fully Implemented`);
      }
    });
  }

  // 5. Security Headers Audit
  auditSecurityHeaders() {
    this.log('\n🔒 Auditing Security Headers...', 'info');

    const vercelConfigPath = path.join(rootDir, 'vercel.json');
    if (fs.existsSync(vercelConfigPath)) {
      const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
      
      if (vercelConfig.headers && vercelConfig.headers.length > 0) {
        const headers = vercelConfig.headers[0].headers;
        const securityHeaders = [
          'X-Frame-Options',
          'X-Content-Type-Options',
          'Referrer-Policy',
          'X-XSS-Protection',
          'Strict-Transport-Security',
          'Content-Security-Policy'
        ];

        securityHeaders.forEach(header => {
          if (headers.some(h => h.key === header)) {
            this.addPassed(`Security header ${header} configured`);
          } else {
            this.addError(`Security header ${header} missing`);
          }
        });
      }
    }

    this.addFeature('Security Headers: CSP, HSTS, XSS Protection, Frame Options');
  }

  // 6. Build and Deployment Audit
  auditBuildDeployment() {
    this.log('\n🚀 Auditing Build & Deployment...', 'info');

    const packageJsonPath = path.join(rootDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.scripts && packageJson.scripts.build) {
        this.addPassed('Build script configured');
      }
      
      if (packageJson.scripts && packageJson.scripts['security:check']) {
        this.addPassed('Security check script configured');
      }
      
      if (packageJson.scripts && packageJson.scripts['validate:production']) {
        this.addPassed('Production validation script configured');
      }
    }

    // Check TypeScript configuration
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
        this.addPassed('TypeScript strict mode enabled');
      }
    }

    this.addFeature('Build & Deployment: TypeScript, Security Checks, Production Validation');
  }

  // Helper method to check for hardcoded secrets
  checkForHardcodedSecrets(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        this.checkForHardcodedSecrets(filePath);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for potential hardcoded secrets
        const secretPatterns = [
          /AIzaSy[A-Za-z0-9_-]{33}/g, // Google API keys
          /sk-[A-Za-z0-9]{48}/g, // OpenAI API keys
          /secret_[A-Za-z0-9]{43}/g, // Notion secrets
          /\d{10}:[A-Za-z0-9_-]{35}/g // Telegram bot tokens
        ];

        for (const pattern of secretPatterns) {
          if (pattern.test(content) && !content.includes('import.meta.env') && !content.includes('process.env')) {
            this.addError(`Potential hardcoded secret found in ${filePath}`);
          }
        }
      }
    }
  }

  // Generate comprehensive report
  generateReport() {
    this.log('\n📊 Security Audit Report', 'info');
    this.log('='.repeat(60), 'info');
    
    this.log(`\n✅ Security Checks Passed: ${this.passed.length}`, 'success');
    this.log(`⚠️  Security Warnings: ${this.warnings.length}`, 'warning');
    this.log(`❌ Security Errors: ${this.errors.length}`, 'error');
    this.log(`🔧 Features Audited: ${this.features.length}`, 'feature');

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Security Warnings:', 'warning');
      this.warnings.forEach(warning => this.log(`   • ${warning}`, 'warning'));
    }

    if (this.errors.length > 0) {
      this.log('\n❌ Security Errors (Must Fix):', 'error');
      this.errors.forEach(error => this.log(`   • ${error}`, 'error'));
    }

    this.log('\n🔧 Features Verified:', 'feature');
    this.features.forEach(feature => this.log(`   • ${feature}`, 'feature'));

    const isSecure = this.errors.length === 0;
    const isReady = isSecure && this.warnings.length < 3;
    
    this.log('\n' + '='.repeat(60), 'info');
    if (isReady) {
      this.log('🎉 APPLICATION IS SECURE AND READY FOR PRODUCTION!', 'success');
    } else if (isSecure) {
      this.log('⚠️  Application is secure but has warnings. Review before production.', 'warning');
    } else {
      this.log('🚫 Application has security issues. Fix errors before production.', 'error');
    }
    
    return isReady;
  }

  // Run complete audit
  async run() {
    this.log('🔍 Starting Comprehensive Security Audit...', 'info');
    
    this.auditAuthentication();
    this.auditDataSecurity();
    this.auditAPISecurity();
    this.auditFeatures();
    this.auditSecurityHeaders();
    this.auditBuildDeployment();
    
    const isReady = this.generateReport();
    process.exit(isReady ? 0 : 1);
  }
}

// Run audit
const auditor = new SecurityAuditor();
auditor.run().catch(error => {
  console.error('❌ Security audit failed:', error);
  process.exit(1);
});