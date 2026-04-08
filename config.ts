// CrickCoach App Configuration (TypeScript)

type AppEnv = 'development' | 'production' | 'test';

export type AppConfig = {
  API_BASE_URL: string;
  API_TIMEOUT: number;
  GOOGLE_TRANSLATE_API_KEY: string;
  RAZORPAY_KEY_ID: string;
};

const config: Record<AppEnv, AppConfig> = {
  development: {
    API_BASE_URL: 'https://api.crickcoachai.com',
    API_TIMEOUT: 600000,
    GOOGLE_TRANSLATE_API_KEY: 'AIzaSyCu_IwIOUfT8L0Dv6YZSv4hgLljSgnaLyc',
    // Public Razorpay key id (safe to ship in the app). Set this to your Razorpay Key ID.
    RAZORPAY_KEY_ID: '',
  },
  production: {
    API_BASE_URL: 'https://api.crickcoachai.com',
    API_TIMEOUT: 600000,
    GOOGLE_TRANSLATE_API_KEY: 'AIzaSyCu_IwIOUfT8L0Dv6YZSv4hgLljSgnaLyc',
    RAZORPAY_KEY_ID: '',
  },
  test: {
    API_BASE_URL: 'https://api.crickcoachai.com',
    API_TIMEOUT: 600000,
    GOOGLE_TRANSLATE_API_KEY: 'AIzaSyCu_IwIOUfT8L0Dv6YZSv4hgLljSgnaLyc',
    RAZORPAY_KEY_ID: '',
  },
};

const getEnvironment = (): AppEnv => {
  if (__DEV__) return 'development';
  return 'production';
};

export const currentConfig: AppConfig = config[getEnvironment()];

export default config;

