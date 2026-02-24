// Test all upload endpoints to identify the 405 error
const testAllUploadEndpoints = async () => {
  const baseURL = 'httpss://b0a929210c19.ngrok-free.app';
  
  console.log('🔍 Testing all upload endpoints...\n');
  console.log('🌐 Base URL:', baseURL);

  const endpoints = [
    '/upload',
    '/api/upload',
    '/api/test-upload'
  ];

  const methods = ['GET', 'POST', 'PUT', 'DELETE'];

  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing endpoint: ${endpoint}`);
    console.log('='.repeat(50));
    
    for (const method of methods) {
      try {
        console.log(`\n🔧 Testing ${method} ${endpoint}`);
        
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 5000
        });
        
        console.log(`   Status: ${response.status}`);
        console.log(`   Status Text: ${response.statusText}`);
        
        if (response.status === 405) {
          console.log(`   ❌ 405 METHOD NOT ALLOWED - ${method} not supported`);
        } else if (response.status === 404) {
          console.log(`   ❌ 404 NOT FOUND - endpoint doesn't exist`);
        } else if (response.status === 200) {
          console.log(`   ✅ 200 OK - ${method} is supported`);
        } else if (response.status === 401) {
          console.log(`   🔐 401 UNAUTHORIZED - authentication required`);
        } else {
          console.log(`   ℹ️  ${response.status} - other response`);
        }
        
      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
      }
    }
  }

  // Test the specific upload endpoint with authentication
  console.log('\n\n🔐 Testing authenticated upload...');
  console.log('='.repeat(50));
  
  try {
    // First login to get token
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
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

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      const token = loginData.token;
      console.log('✅ Login successful, testing authenticated upload...');

      // Test the correct endpoint with authentication
      const testData = new FormData();
      testData.append('video', new Blob(['test'], { type: 'video/mp4' }), 'test.mp4');
      testData.append('player_type', 'batsman');

      const uploadResponse = await fetch(`${baseURL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: testData,
        timeout: 30000
      });

      console.log(`📊 Authenticated upload status: ${uploadResponse.status}`);
      console.log(`📊 Status text: ${uploadResponse.statusText}`);
      
      if (uploadResponse.ok) {
        console.log('✅ Authenticated upload successful!');
      } else {
        const errorText = await uploadResponse.text();
        console.log('❌ Authenticated upload failed:', errorText);
      }
    } else {
      console.log('❌ Login failed');
    }
  } catch (error) {
    console.log('❌ Test error:', error.message);
  }
};

// Run the test
testAllUploadEndpoints();
