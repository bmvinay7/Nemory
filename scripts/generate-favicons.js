#!/usr/bin/env node

/**
 * Favicon Generation Script
 * This script helps generate proper favicon files from the existing nlogo.png
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Favicon Generation Helper');
console.log('============================');

const publicDir = path.join(__dirname, '..', 'public');
const sourceFile = path.join(publicDir, 'nlogo.png');

// Check if source file exists
if (!fs.existsSync(sourceFile)) {
  console.error('❌ Source file nlogo.png not found in public directory');
  process.exit(1);
}

console.log('✅ Source file found: nlogo.png');
console.log('');
console.log('To fix the favicon compression issue, you need to:');
console.log('');
console.log('1. 📐 Create multiple favicon sizes from nlogo.png:');
console.log('   - favicon-16x16.png (16x16 pixels)');
console.log('   - favicon-32x32.png (32x32 pixels)');
console.log('   - favicon-48x48.png (48x48 pixels)');
console.log('   - favicon-64x64.png (64x64 pixels)');
console.log('   - favicon.ico (multi-size ICO file)');
console.log('   - apple-touch-icon.png (180x180 pixels)');
console.log('');
console.log('2. 🛠️ Use one of these methods:');
console.log('');
console.log('   Method A - Online Tool (Recommended):');
console.log('   • Go to https://favicon.io/favicon-converter/');
console.log('   • Upload your nlogo.png file');
console.log('   • Download the generated favicon package');
console.log('   • Extract all files to the public/ directory');
console.log('');
console.log('   Method B - Command Line (if you have ImageMagick):');
console.log('   • brew install imagemagick (on macOS)');
console.log('   • Run these commands in the public/ directory:');
console.log('');
console.log('   convert nlogo.png -resize 16x16 favicon-16x16.png');
console.log('   convert nlogo.png -resize 32x32 favicon-32x32.png');
console.log('   convert nlogo.png -resize 48x48 favicon-48x48.png');
console.log('   convert nlogo.png -resize 64x64 favicon-64x64.png');
console.log('   convert nlogo.png -resize 180x180 apple-touch-icon.png');
console.log('   convert nlogo.png -resize 16x16 -resize 32x32 -resize 48x48 favicon.ico');
console.log('');
console.log('3. ✅ The HTML has already been updated to use these new favicon files');
console.log('');
console.log('This will ensure your favicon appears crisp and uncompressed in all browsers!');
console.log('');

// Create a simple favicon fallback using the existing file
console.log('📋 Creating temporary fallback...');
try {
  const faviconPath = path.join(publicDir, 'favicon.ico');
  if (!fs.existsSync(faviconPath)) {
    // Copy nlogo.png as favicon.ico temporarily
    fs.copyFileSync(sourceFile, faviconPath);
    console.log('✅ Created temporary favicon.ico from nlogo.png');
  }
} catch (error) {
  console.warn('⚠️ Could not create temporary favicon:', error.message);
}

console.log('🎉 Favicon setup complete! Generate the proper sizes when you can.');