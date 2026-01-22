import { router } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../src/services/api';
import { borderRadius, spacing } from '../src/theme';
import { getResponsiveSize, getResponsiveFontSize } from '../src/utils/responsive';

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
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
        text2: 'New password must be at least 6 characters long',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'New passwords do not match',
      });
      return;
    }

    if (oldPassword === newPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'New password must be different from current password',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.changePassword(oldPassword, newPassword);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Password changed successfully',
        });
        
        // Clear form
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Navigate back after a short delay
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to change password',
        });
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to change password. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}>
              Change Password
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(16) }]}>
              Enter your current password and choose a new one
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Current Password"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry={!showOldPassword}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showOldPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowOldPassword(!showOldPassword)}
                />
              }
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showNewPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                />
              }
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              mode="outlined"
              style={styles.input}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
              Password must be at least 6 characters long
            </Text>

            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Change Password
            </Button>

            <Button
              mode="outlined"
              onPress={() => router.back()}
              disabled={loading}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: getResponsiveSize(spacing.lg),
  },
  header: {
    marginBottom: getResponsiveSize(spacing.xl),
    marginTop: getResponsiveSize(spacing.md),
  },
  title: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  subtitle: {
    lineHeight: getResponsiveSize(22),
    // fontSize set dynamically
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: getResponsiveSize(spacing.md),
  },
  hint: {
    marginBottom: getResponsiveSize(spacing.lg),
    marginTop: -getResponsiveSize(spacing.sm),
    // fontSize set dynamically
  },
  button: {
    marginTop: getResponsiveSize(spacing.md),
    marginBottom: getResponsiveSize(spacing.sm),
  },
  cancelButton: {
    marginTop: getResponsiveSize(spacing.sm),
  },
});

