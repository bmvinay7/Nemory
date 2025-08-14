#!/usr/bin/env node

/**
 * Production Validation Script
 * Validates that the application is ready for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = [];
  }

  log(message, type = 'info') {
    const colors = {
      error: '\x1b[31m❌',
      warning: '\x1b[33m⚠️',
      success: '\x1b[32m✅',
      info: '\x1b[36mℹ️'
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

  validateEnvironmentVariables() {
    this.log('\n🔍 Validating Environment Variables...', 'info');
    
    const requiredEnvVars = [
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_STORAGE_BUCKET',
      'VITE_FIREBASE_MESSAGING_SENDER_ID',
      'VITE_FIREBASE_APP_ID',
      'VITE_GOOGLE_AI_API_KEY',
      'VITE_TELEGRAM_BOT_TOKEN',
      'VITE_NOTION_CLIENT_ID',
      'VITE_NOTION_CLIENT_SECRET'
    ];

    const envExamplePath = path.join(rootDir, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
      this.addError('.env.example file is missing');
      return;
    }

    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    
    for (const envVar of requiredEnvVars) {
      if (!envExample.includes(envVar)) {
        this.addError(`${envVar} is missing from .env.example`);
      } else {
        this.addPassed(`${envVar} is documented in .env.example`);
      }
    }
  }

  validateSecurityConfiguration() {
    this.log('\n🔒 Validating Security Configuration...', 'info');

    // Check Firestore rules
    const firestoreRulesPath = path.join(rootDir, 'firestore.rules');
    if (!fs.existsSync(firestoreRulesPath)) {
      this.addError('firestore.rules file is missing');
      return;
    }

    const firestoreRules = fs.readFileSync(firestoreRulesPath, 'utf8');
    
    // Check for proper authentication requirements
    if (firestoreRules.includes('request.auth != null')) {
      this.addPassed('Firestore rules require authentication');
    } else {
      this.addError('Firestore rules do not properly require authentication');
    }

    // Check for user isolation
    if (firestoreRules.includes('request.auth.uid == userId')) {
      this.addPassed('Firestore rules enforce user data isolation');
    } else {
      this.addError('Firestore rules do not properly isolate user data');
    }

    // Check vercel.json security headers
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
            this.addPassed(`Security header ${header} is configured`);
          } else {
            this.addError(`Security header ${header} is missing`);
          }
        });
      } else {
        this.addError('No security headers configured in vercel.json');
      }
    } else {
      this.addWarning('vercel.json not found - security headers may not be configured');
    }
  }

  validateBuildConfiguration() {
    this.log('\n🏗️ Validating Build Configuration...', 'info');

    // Check package.json
    const packageJsonPath = path.join(rootDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addError('package.json is missing');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check build scripts
    if (packageJson.scripts && packageJson.scripts.build) {
      this.addPassed('Build script is configured');
    } else {
      this.addError('Build script is missing from package.json');
    }

    // Check for security audit script
    if (packageJson.scripts && packageJson.scripts['security:check']) {
      this.addPassed('Security check script is configured');
    } else {
      this.addWarning('Security check script is not configured');
    }

    // Check TypeScript configuration
    const tsconfigPath = path.join(rootDir, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
      this.addPassed('TypeScript configuration exists');
      
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      if (tsconfig.compilerOptions && tsconfig.compilerOptions.strict) {
        this.addPassed('TypeScript strict mode is enabled');
      } else {
        this.addWarning('TypeScript strict mode is not enabled');
      }
    } else {
      this.addError('TypeScript configuration is missing');
    }
  }

  validateCodeQuality() {
    this.log('\n📝 Validating Code Quality...', 'info');

    // Check for hardcoded secrets
    const srcDir = path.join(rootDir, 'src');
    if (fs.existsSync(srcDir)) {
      this.checkForHardcodedSecrets(srcDir);
    }

    // Check ESLint configuration
    const eslintConfigPath = path.join(rootDir, 'eslint.config.js');
    if (fs.existsSync(eslintConfigPath)) {
      this.addPassed('ESLint configuration exists');
    } else {
      this.addWarning('ESLint configuration is missing');
    }
  }

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

  validateDeploymentConfiguration() {
    this.log('\n🚀 Validating Deployment Configuration...', 'info');

    // Check Firebase configuration
    const firebaseJsonPath = path.join(rootDir, 'firebase.json');
    if (fs.existsSync(firebaseJsonPath)) {
      this.addPassed('Firebase configuration exists');
      
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
      
      if (firebaseConfig.firestore) {
        this.addPassed('Firestore configuration is present');
      } else {
        this.addError('Firestore configuration is missing from firebase.json');
      }
      
      if (firebaseConfig.hosting) {
        this.addPassed('Firebase hosting configuration is present');
      } else {
        this.addWarning('Firebase hosting configuration is missing');
      }
    } else {
      this.addWarning('firebase.json not found - Firebase deployment may not be configured');
    }

    // Check Vercel configuration
    const vercelJsonPath = path.join(rootDir, 'vercel.json');
    if (fs.existsSync(vercelJsonPath)) {
      this.addPassed('Vercel configuration exists');
      
      const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
      
      if (vercelConfig.rewrites) {
        this.addPassed('Vercel SPA rewrites are configured');
      } else {
        this.addWarning('Vercel SPA rewrites may not be configured');
      }
    } else {
      this.addWarning('vercel.json not found - Vercel deployment may not be configured');
    }
  }

  validateDependencies() {
    this.log('\n📦 Validating Dependencies...', 'info');

    const packageJsonPath = path.join(rootDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.addError('package.json is missing');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Check for critical dependencies
    const criticalDeps = [
      'react',
      'react-dom',
      'firebase',
      'vite',
      'typescript'
    ];

    for (const dep of criticalDeps) {
      if (packageJson.dependencies && packageJson.dependencies[dep]) {
        this.addPassed(`Critical dependency ${dep} is present`);
      } else if (packageJson.devDependencies && packageJson.devDependencies[dep]) {
        this.addPassed(`Critical dependency ${dep} is present (dev)`);
      } else {
        this.addError(`Critical dependency ${dep} is missing`);
      }
    }

    // Check for package-lock.json
    const packageLockPath = path.join(rootDir, 'package-lock.json');
    if (fs.existsSync(packageLockPath)) {
      this.addPassed('package-lock.json exists (dependency versions locked)');
    } else {
      this.addWarning('package-lock.json is missing - dependency versions not locked');
    }
  }

  generateReport() {
    this.log('\n📊 Production Readiness Report', 'info');
    this.log('='.repeat(50), 'info');
    
    this.log(`\n✅ Passed: ${this.passed.length}`, 'success');
    this.log(`⚠️  Warnings: ${this.warnings.length}`, 'warning');
    this.log(`❌ Errors: ${this.errors.length}`, 'error');

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'warning');
      this.warnings.forEach(warning => this.log(`   • ${warning}`, 'warning'));
    }

    if (this.errors.length > 0) {
      this.log('\n❌ Errors that must be fixed:', 'error');
      this.errors.forEach(error => this.log(`   • ${error}`, 'error'));
    }

    const isReady = this.errors.length === 0;
    
    this.log('\n' + '='.repeat(50), 'info');
    if (isReady) {
      this.log('🎉 Application is READY for production deployment!', 'success');
    } else {
      this.log('🚫 Application is NOT ready for production. Please fix the errors above.', 'error');
    }
    
    return isReady;
  }

  async run() {
    this.log('🔍 Starting Production Validation...', 'info');
    
    this.validateEnvironmentVariables();
    this.validateSecurityConfiguration();
    this.validateBuildConfiguration();
    this.validateCodeQuality();
    this.validateDeploymentConfiguration();
    this.validateDependencies();
    
    const isReady = this.generateReport();
    process.exit(isReady ? 0 : 1);
  }
}

// Run validation
const validator = new ProductionValidator();
validator.run().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});