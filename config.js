// CrickCoach App Configuration
// This file can be used to set environment variables for different builds

const config = {
  // Development configuration
  development: {
    API_BASE_URL: 'https://b0a929210c19.ngrok-free.app',
    API_TIMEOUT: 120000,
  },
  
  // Production configuration
  production: {
    API_BASE_URL: 'https://b0a929210c19.ngrok-free.app', // Using ngrok for now
    API_TIMEOUT: 120000,
  },
  
  // Test configuration
  test: {
    API_BASE_URL: 'https://b0a929210c19.ngrok-free.app', // Using ngrok
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