// CrickCoach App Configuration
// This file can be used to set environment variables for different builds

const config = {
  // Development configuration
  development: {
    API_BASE_URL: 'http://165.232.184.91',
    API_TIMEOUT: 600000, // 10 minutes for video uploads and processing
  },
  
  // Production configuration
  production: {
    API_BASE_URL: 'http://165.232.184.91', // Digital Ocean droplet
    API_TIMEOUT: 600000, // 10 minutes for video uploads and processing
  },
  
  // Test configuration
  test: {
    API_BASE_URL: 'http://165.232.184.91', // Digital Ocean droplet
    API_TIMEOUT: 600000, // 10 minutes for video uploads and processing
  }
};

// Get current environment
const getEnvironment = () => {
  if (__DEV__) {
    return 'development';
  }
  return 'production';
};

// Export configuration for current environment
export const currentConfig = config[getEnvironment()];

export default config; 