// CrickCoach App Configuration
// This file can be used to set environment variables for different builds

const config = {
  // Development configuration
  development: {
    // For LOCAL development (backend running on same machine):
    // API_BASE_URL: 'https://localhost:3000',
    
    // For LOCAL development (backend on different machine on same network):
    // Find your computer's IP: ifconfig (Mac/Linux) or ipconfig (Windows)
    // API_BASE_URL: 'https://YOUR_LOCAL_IP:3000',  // e.g., 'https://192.168.1.100:3000'
    
    // For REMOTE server (production/development server):
    // DNS configured: api.crickcoachai.com -> 139.59.1.59 (or 139.50.1.59)
    // Using domain name instead of IP for better maintainability
    // Using Nginx proxy on port 80 (recommended - no port number needed)
    // If SSL/HTTPS is configured, change to: 'https://api.crickcoachai.com'
    // Alternative (direct backend): 'https://api.crickcoachai.com:3000'
    API_BASE_URL: 'https://api.crickcoachai.com',
    API_TIMEOUT: 600000, // 10 minutes for video uploads and processing
  },
  
  // Production configuration
  production: {
    // DNS configured: api.crickcoachai.com -> 139.59.1.59 (or 139.50.1.59)
    // Using domain name instead of IP for better maintainability
    // Using Nginx proxy on port 80 (recommended - no port number needed)
    // If SSL/HTTPS is configured, change to: 'https://api.crickcoachai.com'
    // Alternative (direct backend): 'https://api.crickcoachai.com:3000'
    API_BASE_URL: 'https://api.crickcoachai.com',
    API_TIMEOUT: 600000, // 10 minutes for video uploads and processing
  },
  
  // Test configuration
  test: {
    // DNS configured: api.crickcoachai.com -> 139.59.1.59 (or 139.50.1.59)
    // Using Nginx proxy on port 80
    API_BASE_URL: 'https://api.crickcoachai.com',
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