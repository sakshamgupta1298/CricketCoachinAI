// Test login endpoint specifically
const testLoginEndpoint = async () => {
  const baseURL = 'https://7ffc0e8d88a6.ngrok-free.app';
  const endpoints = [
    '/api/auth/login',
    '/api/login',
    '/auth/login',
    '/login',
    '/api/health' // For comparison
  ];

  console.log('🔍 Testing login endpoints...\n');
  console.log('🌐 Base URL:', baseURL);
  console.log('📡 Testing endpoints:\n');

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing: ${endpoint}`);
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'test123',
          password: 'password123'
        }),
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Status Text: ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS: ${JSON.stringify(data, null, 2)}\n`);
      } else if (response.status === 404) {
        console.log(`   ❌ 404 NOT FOUND: Endpoint doesn't exist\n`);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ ERROR: ${errorText}\n`);
      }
    } catch (error) {
      console.log(`   ❌ NETWORK ERROR: ${error.message}\n`);
    }
  }

  // Also test with GET method to see if the endpoint exists
  console.log('🔍 Testing with GET method to check if endpoints exist...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 GET Testing: ${endpoint}`);
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Status Text: ${response.statusText}\n`);
    } catch (error) {
      console.log(`   ❌ NETWORK ERROR: ${error.message}\n`);
    }
  }
};

// Run the test
testLoginEndpoint(); 