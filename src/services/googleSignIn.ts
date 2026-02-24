import { Platform } from 'react-native';

// Dynamically import Google Sign-In to handle cases where native module isn't available
let GoogleSignin: any;
let statusCodes: any;

try {
  const googleSignInModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignInModule.GoogleSignin;
  statusCodes = googleSignInModule.statusCodes;
} catch (error) {
  console.warn('⚠️ [GOOGLE_SIGNIN] Native module not available. Rebuild the app with: npx expo run:android or npx expo run:ios');
  GoogleSignin = null;
  statusCodes = null;
}

// Configure Google Sign-In for iOS and Android only
// Note: You'll need to replace these with your actual Google OAuth credentials
// Get these from: httpss://console.cloud.google.com/
const configureGoogleSignIn = () => {
  // Check if native module is available
  if (!GoogleSignin) {
    console.warn('⚠️ [GOOGLE_SIGNIN] Native module not available. Please rebuild the app.');
    return;
  }

  // Only configure if running on iOS or Android
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const config: any = {
      // Scopes you want to request
      scopes: ['profile', 'email'],
      // Offline access
      offlineAccess: true,
      // Force code for refresh token
      forceCodeForRefreshToken: true,
    };

    // iOS-specific configuration
    if (Platform.OS === 'ios') {
      config.iosClientId = "1002249784978-gmepmhh1mh8is050hb10be0q40j33k60.apps.googleusercontent.com";
      // Web Client ID is also required for iOS
      config.webClientId = "1002249784978-e98d549dld5a0kdcunu59u15o4kcakk2.apps.googleusercontent.com";
    }

    // Android-specific configuration
    if (Platform.OS === 'android') {
      // Web Client ID is required for Android (can also use androidClientId)
      config.webClientId = "1002249784978-e98d549dld5a0kdcunu59u15o4kcakk2.apps.googleusercontent.com";
      // Optional: Use specific Android Client ID if provided
      if (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) {
        config.androidClientId = "1002249784978-19qb1v8bbcn1hulvsci9tdfngulmvf7g.apps.googleusercontent.com";
      }
    }

    GoogleSignin.configure(config);
    console.log('✅ [GOOGLE_SIGNIN] Configured for', Platform.OS);
    console.log('🔧 [GOOGLE_SIGNIN] Config check:', {
      hasWebClientId: !!config.webClientId,
      hasIosClientId: Platform.OS === 'ios' ? !!config.iosClientId : 'N/A',
      hasAndroidClientId: Platform.OS === 'android' ? !!config.androidClientId : 'N/A',
    });
  } else {
    console.warn('⚠️ [GOOGLE_SIGNIN] Google Sign-In is only supported on iOS and Android');
  }
};

// Initialize configuration
configureGoogleSignIn();

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  photo?: string;
  idToken: string;
  serverAuthCode?: string;
}

/**
 * Sign in with Google (iOS and Android only)
 * @returns User information and tokens
 */
export const signInWithGoogle = async (): Promise<GoogleUserInfo> => {
  // Check if native module is available
  if (!GoogleSignin) {
    throw new Error('Google Sign-In native module not available. Please rebuild the app with: npx expo run:android or npx expo run:ios');
  }

  // Check if platform is supported
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new Error('Google Sign-In is only supported on iOS and Android');
  }

  try {
    // Check if Google Play Services are available (Android only)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // Sign in
    const userInfo = await GoogleSignin.signIn();
    
    if (!userInfo.data) {
      throw new Error('No user data returned from Google Sign-In');
    }

    // Get the ID token
    const tokens = await GoogleSignin.getTokens();
    
    return {
      id: userInfo.data.user.id,
      email: userInfo.data.user.email,
      name: userInfo.data.user.name || '',
      photo: userInfo.data.user.photo || undefined,
      idToken: tokens.idToken,
      serverAuthCode: userInfo.data.serverAuthCode || undefined,
    };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign in was cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services not available');
    } else {
      throw new Error(error.message || 'Google Sign-In failed');
    }
  }
};

/**
 * Sign out from Google (iOS and Android only)
 */
export const signOutFromGoogle = async (): Promise<void> => {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In native module not available. Please rebuild the app.');
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new Error('Google Sign-In is only supported on iOS and Android');
  }

  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Google Sign-Out Error:', error);
    throw error;
  }
};

/**
 * Check if user is currently signed in to Google (iOS and Android only)
 */
export const isSignedIn = async (): Promise<boolean> => {
  if (!GoogleSignin) {
    return false;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  try {
    // Check if user is signed in by trying to get current user
    const user = await GoogleSignin.getCurrentUser();
    return user !== null;
  } catch (error) {
    console.error('Error checking Google sign-in status:', error);
    return false;
  }
};

/**
 * Get current user info (if signed in) - iOS and Android only
 */
export const getCurrentUser = async (): Promise<GoogleUserInfo | null> => {
  if (!GoogleSignin) {
    return null;
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return null;
  }

  try {
    const userInfo = await GoogleSignin.getCurrentUser();
    if (!userInfo) {
      return null;
    }

    const tokens = await GoogleSignin.getTokens();
    
    return {
      id: userInfo.user.id,
      email: userInfo.user.email,
      name: userInfo.user.name || '',
      photo: userInfo.user.photo || undefined,
      idToken: tokens.idToken,
      serverAuthCode: userInfo.serverAuthCode || undefined,
    };
  } catch (error) {
    console.error('Error getting current Google user:', error);
    return null;
  }
};

/**
 * Revoke access (sign out and revoke token) - iOS and Android only
 */
export const revokeAccess = async (): Promise<void> => {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In native module not available. Please rebuild the app.');
  }

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new Error('Google Sign-In is only supported on iOS and Android');
  }

  try {
    await GoogleSignin.revokeAccess();
  } catch (error) {
    console.error('Error revoking Google access:', error);
    throw error;
  }
};

