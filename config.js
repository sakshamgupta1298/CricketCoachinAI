// CrickCoach App Configuration
// This file can be used to set environment variables for different builds

const config = {
  // Development configuration
  development: {
    API_BASE_URL: 'http://192.168.1.3:8000',
    API_TIMEOUT: 120000,
  },
  
  // Production configuration
  production: {
    API_BASE_URL: 'http://192.168.1.3:8000', // Change this to your production server
    API_TIMEOUT: 120000,
  },
  
  // Test configuration
  test: {
    API_BASE_URL: 'http://10.0.2.2:8000', // Android emulator
    API_TIMEOUT: 120000,
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