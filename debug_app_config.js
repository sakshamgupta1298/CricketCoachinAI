// Debug configuration for troubleshooting network issues
const debugConfig = {
  // Test different URLs
  testUrls: [
    'http://139.59.1.59:3000',
    'https://139.59.1.59:3000', // Try HTTPS if available
    'http://localhost:3000', // For local testing
  ],
  
  // Network timeout settings
  timeouts: {
    short: 5000,    // 5 seconds
    medium: 15000,  // 15 seconds
    long: 60000,    // 1 minute
  },
  
  // Debug logging
  enableDebugLogging: true,
  
  // Retry settings
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
};

// Function to test network connectivity
export const testNetworkConnectivity = async () => {
  console.log('🔍 Testing network connectivity...');
  
  for (const url of debugConfig.testUrls) {
    try {
      console.log(`📡 Testing: ${url}`);
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: debugConfig.timeouts.short,
      });
      
      if (response.ok) {
        console.log(`✅ Success: ${url}`);
        return { success: true, url };
      } else {
        console.log(`⚠️ Response not OK: ${url} - ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Failed: ${url} - ${error.message}`);
    }
  }
  
  return { success: false, error: 'All URLs failed' };
};

export default debugConfig;
