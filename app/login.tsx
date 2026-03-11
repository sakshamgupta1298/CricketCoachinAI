import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import * as AppleAuthentication from 'expo-apple-authentication';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { useAuth } from '../src/context/AuthContext';
import apiService from '../src/services/api';
import { signInWithApple } from '../src/services/appleSignIn';
import { signInWithGoogle } from '../src/services/googleSignIn';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

// Check if Google Sign-In is supported (iOS and Android only)
const isGoogleSignInSupported = Platform.OS === 'ios' || Platform.OS === 'android';
const isAppleSignInSupported = Platform.OS === 'ios';

export default function LoginScreen() {
  const theme = useTheme();
  const { login: loginContext } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Responsive dimensions
  const iconSize = getResponsiveSize(180);
  const iconMarginBottom = getResponsiveSize(-30);
  
  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    console.log('🚀 [LOGIN_SCREEN] Submit button pressed');
    console.log('📝 [LOGIN_SCREEN] Form data:', {
      isLogin,
      username,
      email: isLogin ? 'N/A' : email,
      passwordLength: password.length,
      confirmPasswordLength: confirmPassword.length
    });
    
    if (!username || !password) {
      console.log('❌ [LOGIN_SCREEN] Validation failed: Missing username or password');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    if (!isLogin && !email) {
      console.log('❌ [LOGIN_SCREEN] Validation failed: Missing email for registration');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Email is required for registration',
      });
      return;
    }

    // Email format validation
    if (!isLogin && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.log('❌ [LOGIN_SCREEN] Validation failed: Invalid email format');
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Please enter a valid email address',
        });
        return;
      }
    }

    if (!isLogin && password !== confirmPassword) {
      console.log('❌ [LOGIN_SCREEN] Validation failed: Passwords do not match');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    if (!isLogin && password.length < 6) {
      console.log('❌ [LOGIN_SCREEN] Validation failed: Password too short');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 6 characters long',
      });
      return;
    }

    console.log('✅ [LOGIN_SCREEN] Validation passed, starting authentication...');
    setLoading(true);
    
    try {
      let response;
      
      if (isLogin) {
        console.log('🔐 [LOGIN_SCREEN] Attempting login...');
        response = await apiService.login({ username, password });
      } else {
        console.log('📝 [LOGIN_SCREEN] Attempting registration...');
        response = await apiService.register({ username, email, password });
      }

      console.log('📊 [LOGIN_SCREEN] Authentication response:', {
        success: response.success,
        hasError: !!response.error,
        errorMessage: response.error
      });

      if (response.success) {
        console.log('✅ [LOGIN_SCREEN] Authentication successful!');
        console.log('💾 [LOGIN_SCREEN] Storing auth data...');
        
        // Store token and user data
        await apiService.storeAuthData(response.data.token, response.data.user);
        
        // Update AuthContext
        loginContext(response.data.user, response.data.token);
        
        console.log('🎉 [LOGIN_SCREEN] Auth data stored, showing success toast');
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isLogin ? 'Login successful!' : 'Registration successful!',
        });

        console.log('🏠 [LOGIN_SCREEN] Navigating to home page...');
        // Navigate to home page
        router.replace('/(tabs)/home');
      } else {
        console.log('❌ [LOGIN_SCREEN] Authentication failed:', response.error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Authentication failed',
        });
      }
    } catch (error: any) {
      console.error('🚨 [LOGIN_SCREEN] Authentication error:', error);
      console.error('📡 [LOGIN_SCREEN] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Extract error message from the error object
      const errorMessage = error?.response?.error || 
                          error?.message || 
                          'Network error. Please check your connection and ensure the backend server is running.';
      
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: errorMessage,
      });
    } finally {
      console.log('🏁 [LOGIN_SCREEN] Authentication process completed');
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleGoogleSignIn = async () => {
    console.log('🔐 [LOGIN_SCREEN] Google Sign-In button pressed');
    setLoading(true);
    
    try {
      // Sign in with Google
      console.log('📱 [LOGIN_SCREEN] Initiating Google Sign-In...');
      console.log('📱 [LOGIN_SCREEN] Platform:', Platform.OS);
      
      let googleUser;
      try {
        googleUser = await signInWithGoogle();
      } catch (googleError: any) {
        console.error('❌ [LOGIN_SCREEN] Google Sign-In native error:', googleError);
        console.error('❌ [LOGIN_SCREEN] Error details:', {
          message: googleError?.message,
          code: googleError?.code,
          stack: googleError?.stack,
        });
        
        // Check if it's a configuration error
        if (googleError?.message?.includes('native module not available')) {
          Toast.show({
            type: 'error',
            text1: 'Setup Required',
            text2: 'Please rebuild the app: npx expo run:ios',
          });
          setLoading(false);
          return;
        }
        
        // Re-throw to be handled by outer catch
        throw googleError;
      }
      
      console.log('✅ [LOGIN_SCREEN] Google Sign-In successful');
      console.log('📧 [LOGIN_SCREEN] Google email:', googleUser.email);
      
      // Send Google token to backend
      console.log('📡 [LOGIN_SCREEN] Sending Google token to backend...');
      const response = await apiService.googleSignIn({
        idToken: googleUser.idToken,
        email: googleUser.email,
        name: googleUser.name,
        photo: googleUser.photo,
      });

      console.log('📊 [LOGIN_SCREEN] Backend response:', {
        success: response.success,
        hasError: !!response.error,
        errorMessage: response.error
      });

      if (response.success) {
        console.log('✅ [LOGIN_SCREEN] Google authentication successful!');
        console.log('💾 [LOGIN_SCREEN] Storing auth data...');
        
        // Store token and user data
        await apiService.storeAuthData(response.data.token, response.data.user);
        
        // Update AuthContext
        loginContext(response.data.user, response.data.token);
        
        console.log('🎉 [LOGIN_SCREEN] Auth data stored, showing success toast');
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Google Sign-In successful!',
        });

        console.log('🏠 [LOGIN_SCREEN] Navigating to home page...');
        // Navigate to home page
        router.replace('/(tabs)/home');
      } else {
        console.log('❌ [LOGIN_SCREEN] Google authentication failed:', response.error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Google Sign-In failed',
        });
      }
    } catch (error: any) {
      console.error('🚨 [LOGIN_SCREEN] Google Sign-In error:', error);
      console.error('📡 [LOGIN_SCREEN] Error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        platform: Platform.OS,
      });
      
      // Don't show error toast if user cancelled
      if (error?.message && !error.message.includes('cancelled')) {
        let errorMessage = error.message || 'Google Sign-In failed. Please try again.';
        
        // Provide helpful error messages
        if (error.message.includes('native module not available')) {
          errorMessage = 'Google Sign-In not configured. Please rebuild the app.';
        } else if (error.message.includes('configuration')) {
          errorMessage = 'Google Sign-In configuration error. Please check your setup.';
        }
        
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: errorMessage,
        });
      }
    } finally {
      console.log('🏁 [LOGIN_SCREEN] Google Sign-In process completed');
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') return;
    setLoading(true);
    try {
      const appleUser = await signInWithApple();
      const response = await apiService.appleSignIn({
        identityToken: appleUser.identityToken ?? '',
        user: appleUser.id,
        email: appleUser.email ?? undefined,
        fullName: appleUser.fullName ?? undefined,
      });
      if (response.success && response.data) {
        await apiService.storeAuthData(response.data.token, response.data.user);
        loginContext(response.data.user, response.data.token);
        Toast.show({ type: 'success', text1: 'Success', text2: 'Sign in with Apple successful!' });
        router.replace('/(tabs)/home');
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: response.error || 'Apple Sign-In failed' });
      }
    } catch (error: any) {
      if (error?.message && !error.message.includes('cancelled')) {
        Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Apple Sign-In failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={[theme.colors.primary + '15', theme.colors.secondary + '08']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View 
            entering={FadeInDown.delay(100).springify()}
            style={styles.header}
          >
            <Animated.View 
              entering={FadeInUp.delay(200).springify()}
              style={styles.appIconContainer}
            >
              <Image 
                source={require('../assets/images/logo-icon.png')}
                style={[styles.appIcon, { width: iconSize, height: iconSize, marginBottom: iconMarginBottom }]}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.Text 
              entering={FadeInDown.delay(300).springify()}
              style={[styles.appTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(30) }]}
            >
              CrickCoach AI
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(400).springify()}
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}
            >
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </Animated.Text>
          </Animated.View>

          {/* Auth Card */}
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.authCard}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(24) }]}>
                {isLogin ? 'Login' : 'Register'}
              </Text>

              {/* Username Input */}
              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                contentStyle={styles.inputContent}
              />

              {/* Email Input (Registration only) */}
              {!isLogin && (
                <Animated.View entering={FadeInDown.delay(100).springify()}>
                  <TextInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    contentStyle={styles.inputContent}
                  />
                </Animated.View>
              )}

              {/* Password Input */}
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                style={styles.input}
                secureTextEntry
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                contentStyle={styles.inputContent}
              />

              {/* Confirm Password (Registration only) */}
              {!isLogin && (
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                  <TextInput
                    label="Confirm Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    mode="outlined"
                    style={styles.input}
                    secureTextEntry
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    contentStyle={styles.inputContent}
                  />
                </Animated.View>
              )}

              {/* Submit Button */}
              <View style={styles.buttonContainer}>
                <PremiumButton
                  title={isLogin ? 'Login' : 'Register'}
                  onPress={handleSubmit}
                  variant="primary"
                  size="large"
                  loading={loading}
                  disabled={loading}
                  fullWidth
                />
              </View>

              {/* Google Sign-In (iOS and Android only) */}
              {isGoogleSignInSupported && (
                <>
                  {/* Divider */}
                  <View style={styles.dividerContainer}>
                    <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
                    <Text style={[styles.dividerText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                      OR
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: theme.colors.outline }]} />
                  </View>

                  {/* Google Sign-In Button */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      onPress={handleGoogleSignIn}
                      style={[styles.googleButton, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <View style={styles.googleIconContainer}>
                        <Image
                          source={{ 
                            uri: 'https://www.gstatic.com/images/branding/googleg/1x/googleg_standard_color_128dp.png'
                          }}
                          style={styles.googleIcon}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      </View>
                      <Text style={[styles.googleButtonText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
                        Continue with Google
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sign in with Apple (iOS only) */}
                  {isAppleSignInSupported && (
                    <View style={styles.buttonContainer} pointerEvents={loading ? 'none' : 'auto'}>
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                        cornerRadius={8}
                        style={styles.appleButton}
                        onPress={handleAppleSignIn}
                      />
                    </View>
                  )}
                </>
              )}

              {/* Forgot Password and Username Links (Login only) */}
              {isLogin && (
                <View style={styles.forgotLinksContainer}>
                  <TouchableOpacity 
                    onPress={() => router.push('/forgot-password' as any)} 
                    style={styles.forgotLink}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.forgotLinkText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(14) }]}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.forgotLinkSeparator, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                    |
                  </Text>
                  <TouchableOpacity 
                    onPress={() => router.push('/forgot-username' as any)} 
                    style={styles.forgotLink}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.forgotLinkText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(14) }]}>
                      Forgot Username?
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Toggle Mode */}
              <TouchableOpacity 
                onPress={toggleMode} 
                style={styles.toggleContainer}
                activeOpacity={0.7}
              >
                <Text style={[styles.toggleText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(14) }]}>
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <Text style={styles.toggleTextBold}>
                    {isLogin ? 'Register' : 'Login'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </PremiumCard>
          </Animated.View>

          {/* Back to Landing */}
          <Animated.View entering={FadeInUp.delay(600).springify()}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backContainer}
              activeOpacity={0.7}
            >
              <Text style={[styles.backText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                ← Back to Home
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.xxl),
    paddingBottom: getResponsiveSize(spacing.xl),
  },
  header: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.xl),
  },
  appIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom set dynamically
  },
  appIcon: {
    // width, height, marginBottom set dynamically
  },
  appTitle: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.sm),
    letterSpacing: -0.5,
    // fontSize set dynamically
  },
  subtitle: {
    textAlign: 'center',
    fontWeight: '500',
    // fontSize set dynamically
  },
  authCard: {
    marginBottom: getResponsiveSize(spacing.lg),
  },
  cardTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.xl),
    letterSpacing: -0.3,
    // fontSize set dynamically
  },
  input: {
    marginBottom: getResponsiveSize(spacing.md),
    backgroundColor: 'transparent',
  },
  inputContent: {
    fontSize: getResponsiveFontSize(14),
  },
  buttonContainer: {
    marginTop: getResponsiveSize(spacing.md),
    marginBottom: getResponsiveSize(spacing.md),
  },
  forgotLinksContainer: {
    marginTop: getResponsiveSize(spacing.md),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(spacing.sm),
    gap: getResponsiveSize(spacing.sm),
  },
  forgotLink: {
    // Container for individual link
  },
  forgotLinkText: {
    fontWeight: '600',
    textAlign: 'center',
    // fontSize set dynamically
  },
  forgotLinkSeparator: {
    // fontSize set dynamically
  },
  toggleContainer: {
    marginTop: getResponsiveSize(spacing.lg),
    alignItems: 'center',
    paddingVertical: getResponsiveSize(spacing.sm),
  },
  toggleText: {
    fontWeight: '500',
    textAlign: 'center',
    // fontSize set dynamically
  },
  toggleTextBold: {
    fontWeight: '700',
  },
  backContainer: {
    marginTop: getResponsiveSize(spacing.xl),
    alignItems: 'center',
    paddingVertical: getResponsiveSize(spacing.sm),
  },
  backText: {
    fontWeight: '500',
    // fontSize set dynamically
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: getResponsiveSize(spacing.md),
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: getResponsiveSize(spacing.md),
    fontWeight: '500',
    // fontSize set dynamically
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(spacing.md),
    paddingHorizontal: getResponsiveSize(spacing.lg),
    borderRadius: 8,
    borderWidth: 1,
  },
  googleIconContainer: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
    marginRight: getResponsiveSize(spacing.sm),
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    width: getResponsiveSize(24),
    height: getResponsiveSize(24),
  },
  googleButtonText: {
    fontWeight: '600',
    // fontSize set dynamically
  },
  appleButton: {
    width: '100%',
    height: getResponsiveSize(44),
  },
}); 