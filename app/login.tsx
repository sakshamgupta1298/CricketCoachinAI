import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import apiService from '../src/services/api';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function LoginScreen() {
  const theme = useTheme();
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
      
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Network error. Please try again.',
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
}); 