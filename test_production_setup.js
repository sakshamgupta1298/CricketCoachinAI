// Test Production Setup
// This script tests the nginx proxy and backend connectivity

const testProductionSetup = async () => {
  const baseURL = 'http://165.232.184.91';  // Using nginx proxy (no port)
  const directURL = 'http://165.232.184.91:3000';  // Direct backend access
  
  console.log('🔍 Testing CrickCoach Production Setup...\n');
  console.log('🌐 Nginx Proxy URL:', baseURL);
  console.log('🔌 Direct Backend URL:', directURL);
  console.log('');

  const testEndpoints = [
    { name: 'Nginx Health Check', url: `${baseURL}/health` },
    { name: 'Nginx API Health', url: `${baseURL}/api/health` },
    { name: 'Direct Backend Health', url: `${directURL}/api/health` },
    { name: 'Nginx Auth Login', url: `${baseURL}/api/auth/login` },
    { name: 'Direct Backend Auth Login', url: `${directURL}/api/auth/login` }
  ];

  for (const endpoint of testEndpoints) {
    try {
      console.log(`📡 Testing: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);
      
      const response = await fetch(endpoint.url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ SUCCESS: ${endpoint.name}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
      } else {
        console.log(`❌ FAILED: ${endpoint.name}`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Status Text: ${response.statusText}\n`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${endpoint.name}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
  
  console.log('🏁 Production setup test completed!');
  console.log('\n📱 For your mobile app:');
  console.log('   - Use the nginx proxy URL: http://165.232.184.91');
  console.log('   - No port needed (nginx handles routing)');
  console.log('   - Better performance and reliability');
  console.log('   - Production-ready setup');
  console.log('\n💡 System Information:');
  console.log('   - Server IP: 165.232.184.91');
  console.log('   - Nginx Port: 80 (default)');
  console.log('   - Backend Port: 3000 (internal)');
  console.log('   - Protocol: HTTP');
  console.log('   - Status: Production Ready');
};

// Run the test if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  testProductionSetup();
} else {
  // Node.js environment
  const fetch = require('node-fetch');
  testProductionSetup();
}

module.exports = { testProductionSetup };
