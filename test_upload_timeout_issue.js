// Test to identify the upload timeout issue
const testUploadTimeoutIssue = async () => {
  const baseURL = 'https://766855a5614b.ngrok-free.app';
  
  console.log('🔍 Testing upload timeout issue...\n');
  console.log('🌐 Base URL:', baseURL);
  console.log('⏱️  Timeout: 10 minutes');

  try {
    // Step 1: Login to get token
    console.log('📝 Step 1: Logging in...');
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

    if (!loginResponse.ok) {
      console.log('❌ Login failed');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Step 2: Test upload with a small file first
    console.log('\n📤 Step 2: Testing upload with small file...');
    
    const testData = new FormData();
    testData.append('video', new Blob(['test video content'], { type: 'video/mp4' }), 'test_small.mp4');
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
      timeout: 600000 // 10 minutes
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    console.log(`⏱️  Upload took ${duration} seconds`);

    console.log('📊 Upload Response Status:', uploadResponse.status);
    console.log('📊 Status text:', uploadResponse.statusText);

    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log('✅ Upload successful!');
      console.log('📋 Response:', JSON.stringify(uploadData, null, 2));
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload failed');
      console.log('📋 Error:', errorText);
    }

  } catch (error) {
    console.log('❌ Test error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('🚨 TIMEOUT ERROR: Request timed out');
      console.log('💡 This confirms the timeout issue');
    } else if (error.message.includes('Network Error')) {
      console.log('🚨 NETWORK ERROR: Connection lost');
      console.log('💡 This suggests network instability during long processing');
    }
  }
};

// Run the test
testUploadTimeoutIssue();
