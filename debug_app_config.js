// Debug script to check what configuration the app is using
const debugAppConfig = () => {
  console.log('🔍 Debugging App Configuration...\n');
  
  // Simulate the config loading logic
  const config = {
    development: {
      API_BASE_URL: 'https://766855a5614b.ngrok-free.app',
      API_TIMEOUT: 300000,
    },
    production: {
      API_BASE_URL: 'https://766855a5614b.ngrok-free.app',
      API_TIMEOUT: 300000,
    },
    test: {
      API_BASE_URL: 'https://766855a5614b.ngrok-free.app',
      API_TIMEOUT: 300000,
    }
  };

  // Simulate __DEV__ environment
  const __DEV__ = true; // Assume development mode
  
  const getEnvironment = () => {
    if (__DEV__) {
      return 'development';
    }
    return 'production';
  };

  const currentConfig = config[getEnvironment()];
  
  console.log('📋 Current Configuration:');
  console.log('   Environment:', getEnvironment());
  console.log('   API_BASE_URL:', currentConfig.API_BASE_URL);
  console.log('   API_TIMEOUT:', currentConfig.API_TIMEOUT);
  
  console.log('\n🔗 Full Upload URL:');
  console.log('   ', currentConfig.API_BASE_URL + '/api/upload');
  
  console.log('\n✅ Expected Request:');
  console.log('   Method: POST');
  console.log('   URL: https://766855a5614b.ngrok-free.app/api/upload');
  console.log('   Headers: Authorization: Bearer <token>');
  
  console.log('\n❌ If you see /upload instead of /api/upload:');
  console.log('   1. App needs to be rebuilt');
  console.log('   2. Check for cached configuration');
  console.log('   3. Verify the API service is using the latest code');
};

debugAppConfig();
