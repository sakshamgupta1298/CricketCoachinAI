// CrickCoach App Configuration
// This file can be used to set environment variables for different builds

const config = {
  // Development configuration
  development: {
    API_BASE_URL: 'https://766855a5614b.ngrok-free.app',
    API_TIMEOUT: 600000, // 10 minutes for video uploads and processing
  },
  
  // Production configuration
  production: {
    API_BASE_URL: 'https://766855a5614b.ngrok-free.app', // Using ngrok for now
    API_TIMEOUT: 600000, // 10 minutes for video uploads and processing
  },
  
  // Test configuration
  test: {
    API_BASE_URL: 'https://766855a5614b.ngrok-free.app', // Using ngrok
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