#!/usr/bin/env node

/**
 * Pre-commit checks to ensure code quality and functionality
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const runCommand = (command, description) => {
  console.log(`🔍 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} passed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed`);
    return false;
  }
};

const checkEnvironmentConfig = () => {
  console.log('🔍 Checking environment configuration...');
  
  if (!existsSync('.env')) {
    console.error('❌ .env file not found');
    return false;
  }
  
  const envContent = readFileSync('.env', 'utf-8');
  const requiredVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_AUTH_DOMAIN'
  ];
  
  const missingVars = requiredVars.filter(varName => 
    !envContent.includes(varName) || envContent.includes(`${varName}=your-`)
  );
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing or placeholder environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  console.log('✅ Environment configuration looks good');
  return true;
};

const main = async () => {
  console.log('🚀 Running pre-commit checks...\n');
  
  const checks = [
    () => checkEnvironmentConfig(),
    () => runCommand('npm run lint', 'ESLint check'),
    () => runCommand('tsc --noEmit', 'TypeScript compilation check'),
    () => runCommand('npm run build', 'Production build test'),
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    if (!check()) {
      allPassed = false;
    }
    console.log('');
  }
  
  if (allPassed) {
    console.log('🎉 All pre-commit checks passed!');
    process.exit(0);
  } else {
    console.log('💥 Some checks failed. Please fix the issues before committing.');
    process.exit(1);
  }
};

main().catch(console.error);