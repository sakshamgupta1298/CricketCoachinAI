import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

export interface AppleUserInfo {
  id: string;
  email?: string | null;
  fullName?: string | null;
  identityToken?: string | null;
  authorizationCode?: string | null;
}

/**
 * Sign in with Apple (iOS only).
 * Returns basic user info and tokens you can send to your backend.
 */
export const signInWithApple = async (): Promise<AppleUserInfo> => {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign In is only available on iOS devices.');
  }

  // Check if Apple Sign In is supported (iOS 13+)
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple Sign In is not available on this device.');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    return {
      id: credential.user,
      email: credential.email ?? null,
      fullName:
        credential.fullName &&
        `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
          ? `${credential.fullName.givenName ?? ''} ${credential.fullName.familyName ?? ''}`.trim()
          : null,
      identityToken: credential.identityToken ?? null,
      authorizationCode: credential.authorizationCode ?? null,
    };
  } catch (error: any) {
    if (error && error.code === 'ERR_REQUEST_CANCELED') {
      throw new Error('Apple Sign In was cancelled.');
    }
    console.error('Apple Sign In error:', error);
    throw new Error(error?.message || 'Apple Sign In failed.');
  }
};

