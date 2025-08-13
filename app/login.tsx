import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../src/services/api';
import { borderRadius, shadows, spacing } from '../src/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async () => {
    if (!username || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    if (!isLogin && !email) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Email is required for registration',
      });
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
      });
      return;
    }

    if (!isLogin && password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Password must be at least 6 characters long',
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      
      if (isLogin) {
        response = await apiService.login({ username, password });
      } else {
        response = await apiService.register({ username, email, password });
      }

      if (response.success) {
        // Store token and user data
        await apiService.storeAuthData(response.data.token, response.data.user);
        
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: isLogin ? 'Login successful!' : 'Registration successful!',
        });

        // Navigate to home page
        router.replace('/(tabs)/home');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Authentication failed',
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Network error. Please try again.',
      });
    } finally {
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appIcon}>🏏</Text>
          <Text style={[styles.appTitle, { color: theme.colors.onBackground }]}>
            CrickCoach AI
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </Text>
        </View>

        {/* Auth Card */}
        <Surface style={[styles.authCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
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
          />

          {/* Email Input (Registration only) */}
          {!isLogin && (
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          {/* Password Input */}
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
          />

          {/* Confirm Password (Registration only) */}
          {!isLogin && (
            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
            />
          )}

          {/* Submit Button */}
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
          >
            {isLogin ? 'Login' : 'Register'}
          </Button>

          {/* Toggle Mode */}
          <TouchableOpacity onPress={toggleMode} style={styles.toggleContainer}>
            <Text style={[styles.toggleText, { color: theme.colors.primary }]}>
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </Surface>

        {/* Back to Landing */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backContainer}>
          <Text style={[styles.backText, { color: theme.colors.onSurfaceVariant }]}>
            ← Back to Home
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  appIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  authCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    ...shadows.medium,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
  },
  submitButtonContent: {
    paddingVertical: spacing.md,
  },
  toggleContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  backContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
  },
}); 