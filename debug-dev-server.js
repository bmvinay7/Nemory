#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔧 Nemory Development Server Debug Tool');
console.log('=====================================\n');

if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Run this script from the project root directory');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`📦 Project: ${packageJson.name}`);
console.log(`📋 Version: ${packageJson.version}\n`);

// Check for common issues
console.log('🔍 Checking for common development issues...\n');

// 1. Check if node_modules exists
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules directory exists');
} else {
  console.log('❌ node_modules directory missing - run: npm install');
}

// 2. Check if dist directory exists (might cause conflicts)
if (fs.existsSync('dist')) {
  console.log('⚠️  dist directory exists - this might cause conflicts');
  console.log('   Consider running: rm -rf dist');
} else {
  console.log('✅ No dist directory (good for development)');
}

// 3. Check for .env files
const envFiles = ['.env', '.env.local', '.env.development'];
let hasEnvFile = false;
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ Found ${file}`);
    hasEnvFile = true;
  }
});
if (!hasEnvFile) {
  console.log('⚠️  No .env files found - some features may not work');
}

// 4. Check Vite config
if (fs.existsSync('vite.config.ts')) {
  console.log('✅ vite.config.ts exists');
} else {
  console.log('❌ vite.config.ts missing');
}

console.log('\n🚀 Recommended steps to fix development server issues:');
console.log('1. Clear browser cache completely (Ctrl+Shift+Delete)');
console.log('2. Open browser in incognito/private mode');
console.log('3. Clear service workers:');
console.log('   - Open DevTools (F12)');
console.log('   - Go to Application tab');
console.log('   - Click "Service Workers" in sidebar');
console.log('   - Click "Unregister" for any service workers');
console.log('   - Click "Storage" in sidebar');
console.log('   - Click "Clear site data"');
console.log('4. Restart the development server');
console.log('5. Try a different port: npm run dev -- --port 3000');

console.log('\n🔧 Quick fixes to try:');
console.log('rm -rf node_modules package-lock.json && npm install');
console.log('rm -rf dist');
console.log('npm run dev -- --force');

console.log('\n✨ If issues persist, try:');
console.log('npm run build && npm run preview');