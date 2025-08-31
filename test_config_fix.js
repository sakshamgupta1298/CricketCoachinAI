// Test script to verify APK configuration fixes
const testConfigFix = async () => {
  console.log('🔧 Testing APK Configuration Fixes...');
  console.log('=' * 50);
  
  // Test 1: Verify backend is accessible
  console.log('1️⃣ Testing backend accessibility...');
  try {
    const response = await fetch('http://206.189.141.194:3000/api/health');
    if (response.ok) {
      console.log('✅ Backend is accessible');
      const data = await response.json();
      console.log('📄 Response:', data);
    } else {
      console.log('❌ Backend responded with status:', response.status);
    }
  } catch (error) {
    console.log('❌ Backend not accessible:', error.message);
  }
  
  // Test 2: Test authentication endpoint
  console.log('\n2️⃣ Testing authentication endpoint...');
  try {
    const response = await fetch('http://206.189.141.194:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test_user',
        password: 'test_password'
      })
    });
    console.log('✅ Authentication endpoint accessible');
    console.log('📊 Status:', response.status);
  } catch (error) {
    console.log('❌ Authentication endpoint error:', error.message);
  }
  
  // Test 3: Test with different headers
  console.log('\n3️⃣ Testing with different headers...');
  try {
    const response = await fetch('http://206.189.141.194:3000/api/health', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CrickCoach/1.0'
      }
    });
    console.log('✅ Headers test successful');
  } catch (error) {
    console.log('❌ Headers test failed:', error.message);
  }
  
  // Test 4: Test timeout handling
  console.log('\n4️⃣ Testing timeout handling...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://206.189.141.194:3000/api/health', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('✅ Timeout test successful');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ Request timed out');
    } else {
      console.log('❌ Timeout test error:', error.message);
    }
  }
  
  console.log('\n' + '=' * 50);
  console.log('🎯 Configuration Test Complete');
  console.log('📱 Next: Rebuild APK and test on device');
};

// Run the test
testConfigFix().catch(console.error);
