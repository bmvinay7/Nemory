#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Service Worker Issue Fix Script');
console.log('==================================\n');

// Step 1: Clean build artifacts
console.log('1. Cleaning build artifacts...');
try {
  if (fs.existsSync('dist')) {
    execSync('rm -rf dist');
    console.log('   ✅ Removed dist directory');
  }
  
  if (fs.existsSync('node_modules/.vite')) {
    execSync('rm -rf node_modules/.vite');
    console.log('   ✅ Cleared Vite cache');
  }
  
  if (fs.existsSync('.vite')) {
    execSync('rm -rf .vite');
    console.log('   ✅ Cleared .vite directory');
  }
} catch (error) {
  console.log('   ⚠️ Error cleaning artifacts:', error.message);
}

// Step 2: Check for service worker files
console.log('\n2. Checking for service worker files...');
const swFiles = ['public/sw.js', 'public/service-worker.js', 'src/sw.js', 'sw.js'];
let foundSW = false;

swFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`   ❌ Found service worker file: ${file}`);
    foundSW = true;
  }
});

if (!foundSW) {
  console.log('   ✅ No service worker files found');
}

// Step 3: Check Vite config for PWA plugins
console.log('\n3. Checking Vite configuration...');
if (fs.existsSync('vite.config.ts')) {
  const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
  if (viteConfig.includes('VitePWA') || viteConfig.includes('workbox')) {
    console.log('   ⚠️ PWA plugin detected in Vite config - this might cause service worker issues');
  } else {
    console.log('   ✅ No PWA plugins detected in Vite config');
  }
}

// Step 4: Create browser instructions
console.log('\n4. Browser cleanup instructions:');
console.log('   📋 Manual steps required in browser:');
console.log('   1. Open DevTools (F12)');
console.log('   2. Go to Application tab');
console.log('   3. Click "Service Workers" in sidebar');
console.log('   4. Unregister ALL service workers');
console.log('   5. Click "Storage" in sidebar');
console.log('   6. Click "Clear site data"');
console.log('   7. Close and reopen browser');

// Step 5: Create automated browser script
console.log('\n5. Creating automated cleanup script...');
const browserScript = `
// Paste this in browser console (F12) to automatically clean up
(async function() {
  console.log('🧹 Cleaning up service workers and caches...');
  
  // Unregister all service workers
  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (let reg of regs) {
      console.log('Unregistering:', reg.scope);
      await reg.unregister();
    }
  }
  
  // Clear all caches
  if ('caches' in window) {
    const names = await caches.keys();
    for (let name of names) {
      console.log('Deleting cache:', name);
      await caches.delete(name);
    }
  }
  
  // Clear storage
  localStorage.clear();
  sessionStorage.clear();
  
  console.log('✅ Cleanup complete! Reloading...');
  location.reload();
})();
`;

fs.writeFileSync('browser-cleanup.js', browserScript);
console.log('   ✅ Created browser-cleanup.js');

// Step 6: Provide final instructions
console.log('\n🎯 SOLUTION STEPS:');
console.log('==================');
console.log('1. Copy the content of browser-cleanup.js');
console.log('2. Open your browser to http://localhost:8081');
console.log('3. Open DevTools (F12) and go to Console tab');
console.log('4. Paste the script and press Enter');
console.log('5. Wait for automatic reload');
console.log('6. Start dev server: npm run dev -- --force --port 3000');

console.log('\n🔄 Alternative: Complete Reset');
console.log('==============================');
console.log('If the above doesn\'t work:');
console.log('1. Close all browser windows');
console.log('2. Clear browser data completely (Ctrl+Shift+Delete)');
console.log('3. Restart browser');
console.log('4. Try incognito/private mode');
console.log('5. Use different port: npm run dev -- --port 3000');

console.log('\n✨ Prevention for future:');
console.log('========================');
console.log('- Always use incognito mode for development');
console.log('- Clear browser data regularly');
console.log('- Use different ports for different projects');
console.log('- Avoid PWA plugins in development');