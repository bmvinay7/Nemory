// Run this in your browser's console to check for deleted summaries
// Open Developer Tools (F12) → Console → Paste and run this code

console.log('🔍 Checking localStorage for summaries...');

// Get all localStorage keys
const allKeys = Object.keys(localStorage);
console.log(`📊 Total localStorage keys: ${allKeys.length}`);

// Find summary-related keys
const summaryKeys = allKeys.filter(key => key.startsWith('summary_'));
console.log(`📝 Summary keys found: ${summaryKeys.length}`);

// Check each summary
summaryKeys.forEach(key => {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const summary = JSON.parse(data);
      console.log(`\n📄 Summary: ${key}`);
      console.log(`   📅 Created: ${summary.createdAt}`);
      console.log(`   📊 Words: ${summary.wordCount}`);
      console.log(`   🏷️  Tags: ${summary.tags?.join(', ') || 'none'}`);
      console.log(`   📝 Preview: ${summary.summary?.substring(0, 100)}...`);
      
      // Check if this might be the Vinod Khosla summary
      const content = summary.summary?.toLowerCase() || '';
      if (content.includes('vinod khosla') || content.includes('khosla') || 
          content.includes('nithin kamath') || content.includes('podcast')) {
        console.log('   🎯 POTENTIAL MATCH: This might be your Vinod Khosla summary!');
        console.log('   💾 Full summary data:', summary);
      }
    }
  } catch (error) {
    console.warn(`❌ Error parsing ${key}:`, error);
  }
});

console.log('\n🔍 Search complete. Look for "POTENTIAL MATCH" above.');
console.log('💡 If found, copy the full summary data and let me know!');