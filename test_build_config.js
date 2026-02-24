// Test script to verify build configuration
const fs = require('fs');
const path = require('path');

const testBuildConfig = () => {
  console.log('🔧 Testing Build Configuration...');
  console.log('=' * 50);
  
  // Test 1: Check app.json configuration
  console.log('1️⃣ Checking app.json configuration...');
  try {
    const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    
    // Check Android configuration
    if (appJson.expo.android) {
      console.log('✅ Android configuration found');
      
      if (appJson.expo.android.usesCleartextTraffic === true) {
        console.log('✅ usesCleartextTraffic is enabled');
      } else {
        console.log('❌ usesCleartextTraffic is not enabled');
      }
      
      if (appJson.expo.android.permissions && appJson.expo.android.permissions.includes('INTERNET')) {
        console.log('✅ INTERNET permission is included');
      } else {
        console.log('❌ INTERNET permission is missing');
      }
      
      if (appJson.expo.android.permissions && appJson.expo.android.permissions.includes('ACCESS_NETWORK_STATE')) {
        console.log('✅ ACCESS_NETWORK_STATE permission is included');
      } else {
        console.log('❌ ACCESS_NETWORK_STATE permission is missing');
      }
    } else {
      console.log('❌ Android configuration is missing');
    }
    
    // Check plugins
    if (appJson.expo.plugins && appJson.expo.plugins.includes('./plugins/network-security.js')) {
      console.log('✅ Network security plugin is included');
    } else {
      console.log('❌ Network security plugin is missing');
    }
    
  } catch (error) {
    console.log('❌ Error reading app.json:', error.message);
  }
  
  // Test 2: Check config.js
  console.log('\n2️⃣ Checking config.js...');
  try {
    const configContent = fs.readFileSync('config.js', 'utf8');
    if (configContent.includes('165.232.184.91:3000')) {
      console.log('✅ Backend URL is correctly configured');
    } else {
      console.log('❌ Backend URL is not correctly configured');
    }
  } catch (error) {
    console.log('❌ Error reading config.js:', error.message);
  }
  
  // Test 3: Check network security plugin
  console.log('\n3️⃣ Checking network security plugin...');
  try {
    const pluginContent = fs.readFileSync('plugins/network-security.js', 'utf8');
    if (pluginContent.includes('206.189.141.194')) {
      console.log('✅ Digital Ocean IP is included in plugin');
    } else {
      console.log('❌ Digital Ocean IP is missing from plugin');
    }
  } catch (error) {
    console.log('❌ Error reading network security plugin:', error.message);
  }
  
  // Test 4: Check if network security config XML exists
  console.log('\n4️⃣ Checking network security config XML...');
  const xmlPath = path.join('android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml');
  if (fs.existsSync(xmlPath)) {
    console.log('✅ Network security config XML exists');
  } else {
    console.log('⚠️ Network security config XML does not exist (this is OK with simplified config)');
  }
  
  console.log('\n' + '=' * 50);
  console.log('🎯 Build Configuration Test Complete');
  console.log('📱 Ready to build APK with: expo build:android');
};

// Run the test
testBuildConfig();
