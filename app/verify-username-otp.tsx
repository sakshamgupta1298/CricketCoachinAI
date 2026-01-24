import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import apiService from '../src/services/api';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function VerifyUsernameOTPScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<any[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      // Focus on the last filled input or next empty one
      const nextIndex = Math.min(index + pastedOtp.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter the complete 6-digit OTP',
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
      const response = await apiService.verifyUsernameOTP(email, otpString);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'OTP Verified',
          text2: 'Your username has been sent to your email address',
        });
        
        // Navigate back to login after a delay
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Invalid OTP. Please try again.',
        });
        // Clear OTP on error
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to verify OTP. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
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
      const response = await apiService.forgotUsername(email);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'OTP Resent',
          text2: 'Please check your email for the new OTP code',
        });
        setTimer(300); // Reset timer to 5 minutes
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to resend OTP',
        });
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to resend OTP. Please try again.',
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
              Verify OTP
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(400).springify()}
              style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}
            >
              We've sent a verification code to
            </Animated.Text>
            <Animated.Text 
              entering={FadeInDown.delay(450).springify()}
              style={[styles.emailText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(15) }]}
            >
              {email}
            </Animated.Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View entering={FadeInUp.delay(500).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.authCard}>
              {/* OTP Inputs */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <View key={index} style={styles.otpInputWrapper}>
                    <TextInput
                      ref={(ref: any) => (inputRefs.current[index] = ref)}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                      mode="flat"
                      style={[styles.otpInput, { 
                        backgroundColor: theme.colors.surface,
                        borderColor: digit ? theme.colors.primary : theme.colors.outline,
                        borderWidth: 2,
                      }]}
                      keyboardType="number-pad"
                      maxLength={1}
                      textAlign="center"
                      contentStyle={styles.otpInputContent}
                      disabled={loading}
                      selectTextOnFocus
                      underlineColorAndroid="transparent"
                    />
                  </View>
                ))}
              </View>

              {/* Timer/Resend Section */}
              <View style={styles.timerContainer}>
                {!canResend && timer > 0 ? (
                  <View style={styles.timerWrapper}>
                    <Text style={[styles.timerLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
                      Didn't receive code?
                    </Text>
                    <Text style={[styles.timerText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(14), fontWeight: '600' }]}>
                      Resend in {formatTime(timer)}
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    onPress={handleResendOTP}
                    disabled={loading}
                    style={styles.resendContainer}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.resendText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(14), fontWeight: '600' }]}>
                      Resend OTP
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Submit Button */}
              <View style={styles.buttonContainer}>
                <PremiumButton
                  title="Verify OTP"
                  onPress={handleVerifyOTP}
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
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  emailText: {
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.xl),
    // fontSize set dynamically
  },
  authCard: {
    marginBottom: getResponsiveSize(spacing.lg),
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(spacing.xl),
    paddingHorizontal: getResponsiveSize(spacing.sm),
  },
  otpInputWrapper: {
    flex: 1,
    marginHorizontal: getResponsiveSize(4),
  },
  otpInput: {
    width: '100%',
    height: getResponsiveSize(65),
    borderRadius: getResponsiveSize(12),
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
  },
  otpInputContent: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 0,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.lg),
    minHeight: getResponsiveSize(40),
  },
  timerWrapper: {
    alignItems: 'center',
  },
  timerLabel: {
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  timerText: {
    // fontSize set dynamically
  },
  resendContainer: {
    paddingVertical: getResponsiveSize(spacing.sm),
    paddingHorizontal: getResponsiveSize(spacing.md),
  },
  resendText: {
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

