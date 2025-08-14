
export default ({ config }) => ({
  ...config,
  name: 'CrickCoach AI',
  slug: 'crickcoach-ai',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    },
    package: 'com.crickcoach.ai',
    permissions: [
      'INTERNET',
      'ACCESS_NETWORK_STATE',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE'
    ],
    // Allow HTTP traffic for development
    usesCleartextTraffic: true,
    networkSecurityConfig: {
      cleartextTrafficPermitted: true,
      domainConfig: [
        {
          domain: '192.168.1.3',
          cleartextTrafficPermitted: true
        },
        {
          domain: 'localhost',
          cleartextTrafficPermitted: true
        },
        {
          domain: '10.0.2.2',
          cleartextTrafficPermitted: true
        },
        {
          domain: '127.0.0.1',
          cleartextTrafficPermitted: true
        }
      ]
    }
  },
  web: {
    favicon: './assets/favicon.png'
  },
  extra: {
    eas: {
      projectId: '79e6e45c-32d6-4d27-bb86-43572c61e5e2'
    }
  }
}); 