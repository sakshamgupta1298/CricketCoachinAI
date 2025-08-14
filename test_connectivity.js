// Test connectivity script for CrickCoach app
// This script helps verify that the ngrok tunnel is working properly

const testEndpoints = [
  'https://3aa56a9df386.ngrok-free.app/api/health',
  'http://192.168.1.3:8000/api/health', // Fallback to local
  'http://localhost:8000/api/health'    // Fallback to localhost
];

async function testConnectivity() {
  console.log('🔍 Testing connectivity to backend endpoints...\n');
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // Increased timeout for ngrok
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${endpoint}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
      } else {
        console.log(`❌ FAILED: ${endpoint}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Status Text: ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${endpoint}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
  
  console.log('🏁 Connectivity test completed!');
  console.log('\n📱 For your mobile app:');
  console.log('   - Use the ngrok URL: https://3aa56a9df386.ngrok-free.app');
  console.log('   - No more cleartext traffic issues!');
  console.log('   - Works from any network');
}

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  testConnectivity();
} else {
  // Node.js environment
  const fetch = require('node-fetch');
  testConnectivity();
}

module.exports = { testConnectivity }; 