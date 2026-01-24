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

export default function ForgotUsernameScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSendOTP = async () => {
    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter your email address',
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.forgotUsername(email);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'OTP Sent',
          text2: 'Please check your email for the OTP code',
        });
        
        // Navigate to OTP verification screen with email
        router.push({
          pathname: '/verify-username-otp',
          params: { email },
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to send OTP',
        });
      }
    } catch (error: any) {
      console.error('Forgot username error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send OTP. Please try again.',
      });
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
                style={[styles.appIcon, { width: getResponsiveSize(120), height: getResponsiveSize(120) }]}
                resizeMode="contain"
              />
            </Animated.View>
            <Animated.Text 
              entering={FadeInDown.delay(300).springify()}
              style={[styles.appTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}
            >
              Forgot Username
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(400).springify()}
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}
            >
              Enter your registered email address to receive an OTP
            </Animated.Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.authCard}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
                Enter Email Address
              </Text>

              {/* Email Input */}
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
                disabled={loading}
              />

              {/* Submit Button */}
              <View style={styles.buttonContainer}>
                <PremiumButton
                  title="Send OTP"
                  onPress={handleSendOTP}
                  variant="primary"
                  size="large"
                  loading={loading}
                  disabled={loading}
                  fullWidth
                />
              </View>

              {/* Back to Login */}
              <TouchableOpacity 
                onPress={() => router.back()} 
                style={styles.backContainer}
                activeOpacity={0.7}
              >
                <Text style={[styles.backText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(14) }]}>
                  ← Back to Login
                </Text>
              </TouchableOpacity>
            </PremiumCard>
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
    marginBottom: getResponsiveSize(spacing.md),
  },
  appIcon: {
    // width, height set dynamically
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
    paddingHorizontal: getResponsiveSize(spacing.lg),
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
  backContainer: {
    marginTop: getResponsiveSize(spacing.lg),
    alignItems: 'center',
    paddingVertical: getResponsiveSize(spacing.sm),
  },
  backText: {
    fontWeight: '600',
    // fontSize set dynamically
  },
});

