import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
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

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 6 characters long',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Email address is missing',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.resetPassword(email, newPassword);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Password reset successfully! Please login with your new password',
        });
        
        // Navigate to login screen after a delay
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to reset password',
        });
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to reset password. Please try again.',
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
              Reset Password
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(400).springify()}
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}
            >
              Enter your new password
            </Animated.Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.authCard}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
                New Password
              </Text>

              {/* New Password Input */}
              <TextInput
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                mode="outlined"
                style={styles.input}
                secureTextEntry={!showNewPassword}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                contentStyle={styles.inputContent}
                right={
                  <TextInput.Icon
                    icon={showNewPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  />
                }
                autoCapitalize="none"
                autoCorrect={false}
                disabled={loading}
              />

              {/* Confirm Password Input */}
              <TextInput
                label="Confirm New Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                style={styles.input}
                secureTextEntry={!showConfirmPassword}
                outlineColor={theme.colors.outline}
                activeOutlineColor={theme.colors.primary}
                contentStyle={styles.inputContent}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                autoCapitalize="none"
                autoCorrect={false}
                disabled={loading}
              />

              <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
                Password must be at least 6 characters long
              </Text>

              {/* Submit Button */}
              <View style={styles.buttonContainer}>
                <PremiumButton
                  title="Reset Password"
                  onPress={handleResetPassword}
                  variant="primary"
                  size="large"
                  loading={loading}
                  disabled={loading}
                  fullWidth
                />
              </View>

              {/* Back to Login */}
              <TouchableOpacity 
                onPress={() => router.replace('/login')} 
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
  hint: {
    marginBottom: getResponsiveSize(spacing.md),
    marginTop: -getResponsiveSize(spacing.sm),
    // fontSize set dynamically
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

