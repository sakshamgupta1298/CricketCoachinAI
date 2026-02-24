// Comprehensive test to verify mobile app configuration
// Run this in your mobile app's development environment

const testMobileConfig = async () => {
  console.log('🔍 Testing Mobile App Configuration...');
  console.log('🌐 Target Backend: https://165.232.184.91:3000');
  
  // Test 1: Basic fetch
  try {
    console.log('📡 Testing basic fetch...');
    const response = await fetch('https://165.232.184.91:3000/api/health');
    console.log('✅ Basic fetch successful:', response.status);
    const data = await response.text();
    console.log('📄 Response:', data);
  } catch (error) {
    console.log('❌ Basic fetch failed:', error.message);
    console.log('🔍 Error details:', error);
  }
  
  // Test 2: With specific headers
  try {
    console.log('🔧 Testing with specific headers...');
    const response = await fetch('https://165.232.184.91:3000/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'CrickCoach/1.0'
      }
    });
    console.log('✅ Headers test successful:', response.status);
  } catch (error) {
    console.log('❌ Headers test failed:', error.message);
  }
  
  // Test 3: POST request
  try {
    console.log('📝 Testing POST request...');
    const response = await fetch('https://165.232.184.91:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'test_mobile_config',
        email: 'test_mobile@example.com',
        password: 'testpass123'
      })
    });
    console.log('✅ POST test successful:', response.status);
  } catch (error) {
    console.log('❌ POST test failed:', error.message);
  }

  // Test 4: Test with timeout
  try {
    console.log('⏱️ Testing with timeout...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch('https://165.232.184.91:3000/api/health', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('✅ Timeout test successful:', response.status);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('❌ Timeout test failed: Request timed out');
    } else {
      console.log('❌ Timeout test failed:', error.message);
    }
  }

  // Test 5: Test different endpoints
  const endpoints = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`🔗 Testing endpoint: ${endpoint}`);
      const response = await fetch(`https://165.232.184.91:3000${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
};

// Export for use in React Native
export default testMobileConfig;
