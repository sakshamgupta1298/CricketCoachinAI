// Test upload endpoint specifically
const testUploadEndpoint = async () => {
  const baseURL = 'httpss://b0a929210c19.ngrok-free.app';
  const endpoints = [
    '/api/upload',
    '/api/upload-video',
    '/api/analyze',
    '/api/video/upload',
    '/upload',
    '/api/health' // For comparison
  ];

  console.log('🔍 Testing upload endpoints...\n');
  console.log('🌐 Base URL:', baseURL);
  console.log('📡 Testing endpoints:\n');

  // Test with GET method first to see if endpoints exist
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
      console.log(`   Status Text: ${response.statusText}`);
      
      if (response.status === 405) {
        console.log(`   ℹ️  Method Not Allowed - endpoint exists but doesn't accept GET\n`);
      } else if (response.status === 404) {
        console.log(`   ❌ 404 NOT FOUND - endpoint doesn't exist\n`);
      } else {
        console.log(`   ✅ Endpoint accessible\n`);
      }
    } catch (error) {
      console.log(`   ❌ NETWORK ERROR: ${error.message}\n`);
    }
  }

  // Test with POST method (without file for now)
  console.log('🔍 Testing with POST method...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 POST Testing: ${endpoint}`);
      
      const response = await fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test: 'data'
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
};

// Run the test
testUploadEndpoint();
