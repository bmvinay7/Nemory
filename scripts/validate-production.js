#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that all security measures are in place before deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProductionValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validateFirestoreRules() {
    console.log('🔍 Validating Firestore rules...');
    
    try {
      const rulesPath = path.join(__dirname, '../firestore.rules');
      const rules = fs.readFileSync(rulesPath, 'utf8');
      
      // Check for overly permissive rules
      if (rules.includes('allow read, write: if request.auth != null;') && 
          rules.includes('match /{document=**}')) {
        this.errors.push('Firestore rules contain overly permissive wildcard rule');
      }
      
      // Check for proper user isolation
      if (!rules.includes('request.auth.uid == userId')) {
        this.warnings.push('Firestore rules may not properly isolate user data');
      }
      
      console.log('✅ Firestore rules validation complete');
    } catch (error) {
      this.errors.push(`Failed to read Firestore rules: ${error.message}`);
    }
  }

  validateSecurityHeaders() {
    console.log('🔍 Validating security headers...');
    
    try {
      const vercelConfigPath = path.join(__dirname, '../vercel.json');
      const config = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
      
      const headers = config.headers?.[0]?.headers || [];
      const headerKeys = headers.map(h => h.key);
      
      const requiredHeaders = [
        'X-Frame-Options',
        'X-Content-Type-Options',
        'Content-Security-Policy',
        'Strict-Transport-Security'
      ];
      
      const missingHeaders = requiredHeaders.filter(h => !headerKeys.includes(h));
      if (missingHeaders.length > 0) {
        this.errors.push(`Missing security headers: ${missingHeaders.join(', ')}`);
      }
      
      console.log('✅ Security headers validation complete');
    } catch (error) {
      this.errors.push(`Failed to validate security headers: ${error.message}`);
    }
  }

  validateTypeScriptConfig() {
    console.log('🔍 Validating TypeScript configuration...');
    
    try {
      const tsconfigPath = path.join(__dirname, '../tsconfig.json');
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
      
      const compilerOptions = tsconfig.compilerOptions || {};
      
      if (!compilerOptions.strict) {
        this.errors.push('TypeScript strict mode is not enabled');
      }
      
      if (compilerOptions.noImplicitAny === false) {
        this.errors.push('TypeScript noImplicitAny is disabled');
      }
      
      if (compilerOptions.strictNullChecks === false) {
        this.errors.push('TypeScript strictNullChecks is disabled');
      }
      
      console.log('✅ TypeScript configuration validation complete');
    } catch (error) {
      this.errors.push(`Failed to validate TypeScript config: ${error.message}`);
    }
  }

  validateAPIEndpoints() {
    console.log('🔍 Validating API endpoints...');
    
    const apiDir = path.join(__dirname, '../api');
    
    try {
      const apiFiles = fs.readdirSync(apiDir).filter(f => f.endsWith('.js'));
      
      for (const file of apiFiles) {
        const filePath = path.join(apiDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for rate limiting
        if (!content.includes('rateLimitMap') && !content.includes('checkRateLimit')) {
          this.warnings.push(`${file} may be missing rate limiting`);
        }
        
        // Check for CORS wildcard
        if (content.includes("'Access-Control-Allow-Origin', '*'")) {
          this.errors.push(`${file} uses CORS wildcard (*)`);
        }
        
        // Check for input validation
        if (!content.includes('typeof') || !content.includes('length >')) {
          this.warnings.push(`${file} may be missing input validation`);
        }
      }
      
      console.log('✅ API endpoints validation complete');
    } catch (error) {
      this.errors.push(`Failed to validate API endpoints: ${error.message}`);
    }
  }

  validateEnvironmentExample() {
    console.log('🔍 Validating environment example...');
    
    try {
      const envExamplePath = path.join(__dirname, '../.env.example');
      const envExample = fs.readFileSync(envExamplePath, 'utf8');
      
      // Check for placeholder values
      const requiredVars = [
        'VITE_GOOGLE_AI_API_KEY',
        'VITE_TELEGRAM_BOT_TOKEN',
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_PROJECT_ID'
      ];
      
      for (const varName of requiredVars) {
        if (!envExample.includes(varName)) {
          this.warnings.push(`Missing ${varName} in .env.example`);
        }
      }
      
      console.log('✅ Environment example validation complete');
    } catch (error) {
      this.warnings.push(`Failed to validate .env.example: ${error.message}`);
    }
  }

  validateDebugCodeRemoval() {
    console.log('🔍 Checking for debug code...');
    
    const srcDir = path.join(__dirname, '../src');
    
    try {
      const checkDirectory = (dir) => {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isDirectory()) {
            checkDirectory(filePath);
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            
            // Check for debug console logs
            const debugPatterns = [
              /console\.log\(/g,
              /console\.debug\(/g,
              /debugger;/g,
              /TODO:/g,
              /FIXME:/g
            ];
            
            for (const pattern of debugPatterns) {
              const matches = content.match(pattern);
              if (matches && matches.length > 0) {
                this.warnings.push(`${file} contains ${matches.length} debug statements`);
              }
            }
          }
        }
      };
      
      checkDirectory(srcDir);
      console.log('✅ Debug code check complete');
    } catch (error) {
      this.warnings.push(`Failed to check for debug code: ${error.message}`);
    }
  }

  validatePackageJson() {
    console.log('🔍 Validating package.json...');
    
    try {
      const packagePath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Check for security scripts
      const scripts = packageJson.scripts || {};
      if (!scripts['security:check']) {
        this.warnings.push('Missing security:check script in package.json');
      }
      
      console.log('✅ Package.json validation complete');
    } catch (error) {
      this.errors.push(`Failed to validate package.json: ${error.message}`);
    }
  }

  run() {
    console.log('🚀 Starting production validation...\n');
    
    this.validateFirestoreRules();
    this.validateSecurityHeaders();
    this.validateTypeScriptConfig();
    this.validateAPIEndpoints();
    this.validateEnvironmentExample();
    this.validateDebugCodeRemoval();
    this.validatePackageJson();
    
    console.log('\n📊 Validation Results:');
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS (must fix before deployment):');
      this.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (recommended to fix):');
      this.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('\n✅ All validation checks passed! Ready for production deployment.');
      process.exit(0);
    } else if (this.errors.length === 0) {
      console.log('\n✅ No critical errors found. Warnings should be addressed but deployment can proceed.');
      process.exit(0);
    } else {
      console.log('\n❌ Critical errors found. Please fix before deploying to production.');
      process.exit(1);
    }
  }
}

// Run validation
const validator = new ProductionValidator();
validator.run();