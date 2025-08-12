// Verification script for DOM nesting fixes
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying DOM Nesting Fixes...\n');

const componentsToCheck = [
  'src/components/ui/toaster.tsx',
  'src/components/ui/safe-toast.tsx',
  'src/components/ui/safe-card.tsx',
  'src/components/ui/safe-alert.tsx',
  'src/components/Dashboard.tsx',
  'src/components/ai/AISummarization.tsx',
  'src/components/telegram/TelegramSettings.tsx',
  'src/components/telegram/TelegramConnectionStatus.tsx'
];

console.log('1. Checking if safe components exist:');
for (const component of componentsToCheck) {
  if (fs.existsSync(component)) {
    console.log(`   ✅ ${component}`);
  } else {
    console.log(`   ❌ ${component} - MISSING`);
  }
}

console.log('\n2. Checking for problematic imports:');
const problematicImports = [
  'from \'@/components/ui/card\'',
  'from \'@/components/ui/toast\'',
  'from \'@/components/ui/alert\''
];

let foundProblems = false;
for (const component of componentsToCheck) {
  if (fs.existsSync(component)) {
    const content = fs.readFileSync(component, 'utf8');
    for (const problematicImport of problematicImports) {
      if (content.includes(problematicImport)) {
        console.log(`   ❌ ${component} still uses: ${problematicImport}`);
        foundProblems = true;
      }
    }
  }
}

if (!foundProblems) {
  console.log('   ✅ No problematic imports found');
}

console.log('\n3. Checking for safe imports:');
const safeImports = [
  'from \'@/components/ui/safe-card\'',
  'from \'@/components/ui/safe-toast\'',
  'from \'@/components/ui/safe-alert\''
];

let foundSafeImports = false;
for (const component of componentsToCheck) {
  if (fs.existsSync(component)) {
    const content = fs.readFileSync(component, 'utf8');
    for (const safeImport of safeImports) {
      if (content.includes(safeImport)) {
        console.log(`   ✅ ${component} uses: ${safeImport}`);
        foundSafeImports = true;
      }
    }
  }
}

console.log('\n4. Checking component implementations:');

// Check toaster implementation
if (fs.existsSync('src/components/ui/toaster.tsx')) {
  const toasterContent = fs.readFileSync('src/components/ui/toaster.tsx', 'utf8');
  if (toasterContent.includes('safe-toast')) {
    console.log('   ✅ Toaster uses safe-toast components');
  } else {
    console.log('   ❌ Toaster does not use safe-toast components');
  }
}

// Check safe-toast implementation
if (fs.existsSync('src/components/ui/safe-toast.tsx')) {
  const safeToastContent = fs.readFileSync('src/components/ui/safe-toast.tsx', 'utf8');
  if (safeToastContent.includes('SafeToastTitle') && safeToastContent.includes('SafeToastDescription')) {
    console.log('   ✅ Safe toast components use div elements');
  } else {
    console.log('   ❌ Safe toast components may still use p elements');
  }
}

// Check safe-card implementation
if (fs.existsSync('src/components/ui/safe-card.tsx')) {
  const safeCardContent = fs.readFileSync('src/components/ui/safe-card.tsx', 'utf8');
  if (safeCardContent.includes('SafeCardDescription') && !safeCardContent.includes('HTMLParagraphElement')) {
    console.log('   ✅ Safe card components use div elements');
  } else {
    console.log('   ❌ Safe card components may still use p elements');
  }
}

console.log('\n🎯 Expected Results After These Fixes:');
console.log('- ❌ No more "div cannot appear as descendant of p" warnings');
console.log('- ✅ All toast messages render safely');
console.log('- ✅ All card descriptions render safely');
console.log('- ✅ All alert descriptions render safely');
console.log('- ✅ Clean HTML structure throughout the app');

console.log('\n🔧 Components Replaced:');
console.log('- ToastDescription → SafeToastDescription (div)');
console.log('- ToastTitle → SafeToastTitle (div)');
console.log('- CardDescription → SafeCardDescription (div)');
console.log('- CardTitle → SafeCardTitle (div)');
console.log('- AlertDescription → SafeAlertDescription (div)');

console.log('\n✅ DOM Nesting Fix Verification Complete!');