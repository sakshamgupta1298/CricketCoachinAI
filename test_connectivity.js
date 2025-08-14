// Test connectivity script for CrickCoach app
// This script helps verify that cleartext traffic is properly configured

const testEndpoints = [
  'http://192.168.1.3:8000/api/health',
  'http://10.0.2.2:8000/api/health',
  'http://localhost:8000/api/health',
  'http://127.0.0.1:8000/api/health'
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
        timeout: 5000
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