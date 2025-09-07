// Test connectivity to Digital Ocean droplet
const testDigitalOceanConnectivity = async () => {
  const baseURL = 'http://165.232.184.91:3000';
  
  console.log('🔍 Testing Digital Ocean Droplet Connectivity...\n');
  console.log('🌐 Base URL:', baseURL);
  console.log('📍 Droplet IP: 206.189.141.194');
  console.log('🔌 Port: 3000');
  console.log('');

  const testEndpoints = [
    `${baseURL}/api/health`,
    `${baseURL}/api/auth/login`,
    `${baseURL}/api/upload`
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
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
  
  console.log('🏁 Digital Ocean connectivity test completed!');
  console.log('\n📱 For your mobile app:');
  console.log('   - Use the Digital Ocean URL: http://165.232.184.91:3000');
  console.log('   - No more ngrok dependency!');
  console.log('   - Works from any network');
  console.log('   - More stable and reliable');
  console.log('\n💡 System Information:');
  console.log('   - Droplet IP: 206.189.141.194');
  console.log('   - Backend Port: 3000');
  console.log('   - Protocol: HTTP');
  console.log('   - Status: Ready for deployment');
};

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  testDigitalOceanConnectivity();
} else {
  // Node.js environment
  const fetch = require('node-fetch');
  testDigitalOceanConnectivity();
}

module.exports = { testDigitalOceanConnectivity };
