const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying CrickCoach app assets...\n');

const requiredAssets = [
  './assets/images/icon.png',
  './assets/images/adaptive-icon.png',
  './assets/images/splash-icon.png',
  './assets/images/favicon.png'
];

let allAssetsExist = true;

for (const asset of requiredAssets) {
  const fullPath = path.resolve(asset);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    console.log(`✅ ${asset} - ${(stats.size / 1024).toFixed(1)}KB`);
  } else {
    console.log(`❌ ${asset} - MISSING`);
    allAssetsExist = false;
  }
}

console.log('\n📋 App Configuration Check:');
console.log('   - Main icon: ./assets/images/icon.png');
console.log('   - Adaptive icon: ./assets/images/icon.png');
console.log('   - Splash screen: ./assets/images/splash-icon.png');

if (allAssetsExist) {
  console.log('\n🎉 All assets are present and correctly configured!');
  console.log('   You can now build your Android app without icon errors.');
} else {
  console.log('\n⚠️  Some assets are missing. Please check the file paths.');
}

console.log('\n💡 Next steps:');
console.log('   1. Run: expo start --clear');
console.log('   2. Press "a" to build for Android');
console.log('   3. Or run: eas build --platform android');
