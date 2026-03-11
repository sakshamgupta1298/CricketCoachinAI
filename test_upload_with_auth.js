// Test upload endpoint with authentication
const testUploadWithAuth = async () => {
  const baseURL = 'https://b0a929210c19.ngrok-free.app';
  
  console.log('🔍 Testing upload with authentication...\n');
  console.log('🌐 Base URL:', baseURL);

  // Step 1: Login to get token
  console.log('📝 Step 1: Logging in to get token...');
  try {
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
      console.log('✅ Login successful');
      console.log('🔑 Token received:', token.substring(0, 20) + '...');

      // Step 2: Test upload with token
      console.log('\n📤 Step 2: Testing upload with authentication...');
      
      // Create a simple test file (just for testing the endpoint)
      const testData = new FormData();
      testData.append('video', new Blob(['test video content'], { type: 'video/mp4' }), 'test.mp4');
      testData.append('player_type', 'batsman');
      testData.append('batter_side', 'right');

      const uploadResponse = await fetch(`${baseURL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, let the browser set it
        },
        body: testData,
        timeout: 30000
      });

      console.log('📊 Upload Response Status:', uploadResponse.status);
      console.log('📊 Upload Response Status Text:', uploadResponse.statusText);

      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        console.log('✅ Upload successful!');
        console.log('📋 Response:', JSON.stringify(uploadData, null, 2));
      } else {
        const errorText = await uploadResponse.text();
        console.log('❌ Upload failed');
        console.log('📋 Error:', errorText);
      }

    } else {
      console.log('❌ Login failed');
      const errorText = await loginResponse.text();
      console.log('📋 Error:', errorText);
    }

  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
};

// Run the test
testUploadWithAuth();
