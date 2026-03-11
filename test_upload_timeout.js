// Test upload with extended timeout and detailed error reporting
const testUploadTimeout = async () => {
  const baseURL = 'https://b0a929210c19.ngrok-free.app';
  
  console.log('🔍 Testing upload with extended timeout...\n');
  console.log('🌐 Base URL:', baseURL);
  console.log('⏱️  Timeout: 5 minutes');

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

      // Step 2: Test upload with extended timeout
      console.log('\n📤 Step 2: Testing upload with 5-minute timeout...');
      
      // Create a larger test file to simulate real upload
      const testContent = 'test video content '.repeat(1000); // Make it larger
      const testData = new FormData();
      testData.append('video', new Blob([testContent], { type: 'video/mp4' }), 'test_large.mp4');
      testData.append('player_type', 'batsman');
      testData.append('batter_side', 'right');

      console.log('📤 Starting upload...');
      const startTime = Date.now();

      const uploadResponse = await fetch(`${baseURL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: testData,
        timeout: 300000 // 5 minutes
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      console.log(`⏱️  Upload took ${duration} seconds`);

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
        
        // Check for specific error types
        if (uploadResponse.status === 408) {
          console.log('🚨 TIMEOUT ERROR: Request timed out');
        } else if (uploadResponse.status === 413) {
          console.log('🚨 PAYLOAD TOO LARGE: File too big');
        } else if (uploadResponse.status === 500) {
          console.log('🚨 SERVER ERROR: Backend processing failed');
        }
      }

    } else {
      console.log('❌ Login failed');
      const errorText = await loginResponse.text();
      console.log('📋 Error:', errorText);
    }

  } catch (error) {
    console.log('❌ Network error:', error.message);
    
    // Check for specific error types
    if (error.message.includes('timeout')) {
      console.log('🚨 TIMEOUT ERROR: Request timed out');
    } else if (error.message.includes('network')) {
      console.log('🚨 NETWORK ERROR: Connection failed');
    } else if (error.message.includes('fetch')) {
      console.log('🚨 FETCH ERROR: Request failed');
    }
  }
};

// Run the test
testUploadTimeout();
