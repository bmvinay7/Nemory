#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 PWA Errors Fix Script');
console.log('========================\n');

// Step 1: Kill any existing development servers
console.log('1. Killing existing development servers...');
try {
  execSync('pkill -f "vite"', { stdio: 'ignore' });
  execSync('pkill -f "node.*vite"', { stdio: 'ignore' });
  console.log('   ✅ Killed existing Vite processes');
} catch (error) {
  console.log('   ℹ️ No existing Vite processes found');
}

// Step 2: Clean build artifacts and caches
console.log('\n2. Cleaning build artifacts and caches...');
const cleanupPaths = [
  'dist',
  'node_modules/.vite',
  '.vite',
  'node_modules/.cache'
];

cleanupPaths.forEach(path => {
  if (fs.existsSync(path)) {
    try {
      execSync(`rm -rf ${path}`);
      console.log(`   ✅ Removed ${path}`);
    } catch (error) {
      console.log(`   ⚠️ Could not remove ${path}: ${error.message}`);
    }
  }
});

// Step 3: Create a manifest.webmanifest to prevent 404 errors
console.log('\n3. Creating minimal manifest.webmanifest to prevent 404...');
const manifest = {
  name: "Nemory Development",
  short_name: "Nemory Dev",
  description: "Nemory Development Server",
  start_url: "/",
  display: "browser",
  background_color: "#ffffff",
  theme_color: "#000000",
  icons: [
    {
      src: "/nlogo.png",
      sizes: "192x192",
      type: "image/png"
    }
  ]
};

fs.writeFileSync('public/manifest.webmanifest', JSON.stringify(manifest, null, 2));
console.log('   ✅ Created public/manifest.webmanifest');

// Step 4: Create a dummy pwa-entry-point-loaded file
console.log('\n4. Creating dummy PWA entry point...');
fs.writeFileSync('public/pwa-entry-point-loaded', '// PWA entry point loaded');
console.log('   ✅ Created public/pwa-entry-point-loaded');

// Step 5: Update index.html to reference the manifest
console.log('\n5. Updating index.html...');
let indexHtml = fs.readFileSync('index.html', 'utf8');

// Add manifest link if not present
if (!indexHtml.includes('manifest.webmanifest')) {
  const manifestLink = '    <link rel="manifest" href="/manifest.webmanifest" />';
  indexHtml = indexHtml.replace(
    '<meta property="og:image" content="/og-image-update.png" />',
    '<meta property="og:image" content="/og-image-update.png" />\n' + manifestLink
  );
  fs.writeFileSync('index.html', indexHtml);
  console.log('   ✅ Added manifest link to index.html');
} else {
  console.log('   ℹ️ Manifest link already present in index.html');
}

console.log('\n🎯 SOLUTION COMPLETE');
console.log('===================');
console.log('✅ Killed existing servers');
console.log('✅ Cleaned caches and build artifacts');
console.log('✅ Created manifest.webmanifest');
console.log('✅ Created PWA entry point file');
console.log('✅ Updated index.html');

console.log('\n🚀 Next Steps:');
console.log('1. Start the development server:');
console.log('   npm run dev -- --port 3000');
console.log('2. Open browser to: http://localhost:3000');
console.log('3. Clear browser cache if needed (Ctrl+Shift+Delete)');

console.log('\n💡 If you still see errors:');
console.log('- Try incognito/private mode');
console.log('- Clear browser data completely');
console.log('- Use the diagnostic tool: http://localhost:3000/test.html');