import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../../src/services/api';
import { shadows, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const [apiUrl, setApiUrl] = useState(apiService.getBaseURL());
  const [isTesting, setIsTesting] = useState(false);

  const handleLogout = async () => {
    console.log('🔴 PROFILE SCREEN LOGOUT TRIGGERED');
    
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('❌ Logout cancelled by user')
        },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            console.log('✅ User confirmed logout from profile screen');
            try {
              console.log('Calling apiService.logout() from profile...');
              const response = await apiService.logout();
              console.log('Profile logout response:', response);
              
              if (response.success) {
                console.log('Profile logout successful, showing toast...');
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Logged out successfully',
                });
                
                console.log('Navigating to landing page from profile...');
                router.replace('/landing');
              } else {
                console.log('Profile logout failed, showing error toast...');
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: response.error || 'Logout failed',
                });
              }
            } catch (error) {
              console.error('Profile logout error:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Logout failed',
              });
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    console.log('🔴 PROFILE SCREEN DELETE ACCOUNT TRIGGERED');
    
    // First confirmation - general warning
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('❌ Delete account cancelled by user')
        },
        { 
          text: 'Continue', 
          style: 'destructive',
          onPress: () => {
            // Second confirmation - final warning
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure you want to delete your account? This will permanently remove:\n\n• Your account\n• All analysis history\n• All uploaded videos\n• All training plans\n\nThis action cannot be undone.',
              [
                { 
                  text: 'Cancel', 
                  style: 'cancel',
                  onPress: () => console.log('❌ Delete account cancelled at final confirmation')
                },
                { 
                  text: 'DELETE ACCOUNT', 
                  style: 'destructive',
                  onPress: async () => {
                    console.log('✅ User confirmed account deletion');
                    try {
                      console.log('Calling apiService.deleteAccount()...');
                      const response = await apiService.deleteAccount();
                      console.log('Delete account response:', response);
                      
                      if (response.success) {
                        console.log('Account deletion successful, showing toast...');
                        Toast.show({
                          type: 'success',
                          text1: 'Account Deleted',
                          text2: 'Your account has been permanently deleted',
                        });
                        
                        console.log('Navigating to landing page after account deletion...');
                        router.replace('/landing');
                      } else {
                        console.log('Account deletion failed, showing error toast...');
                        Toast.show({
                          type: 'error',
                          text1: 'Error',
                          text2: response.error || 'Failed to delete account',
                        });
                      }
                    } catch (error) {
                      console.error('Delete account error:', error);
                      Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Failed to delete account',
                      });
                    }
                  }
                },
              ]
            );
          }
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to clear all analysis history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive' },
    ]);
  };

  const handleUpdateApiUrl = () => {
    if (apiUrl.trim()) {
      apiService.updateBaseURL(apiUrl.trim());
      Alert.alert('Success', 'API URL updated successfully!');
    } else {
      Alert.alert('Error', 'Please enter a valid API URL');
    }
  };

  const testApiConnection = async () => {
    setIsTesting(true);
    try {
      const response = await apiService.healthCheck();
      if (response.success) {
        Alert.alert('Success', 'API connection successful!');
      } else {
        Alert.alert('Error', `API connection failed: ${response.error}`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to API. Please check the URL and ensure the backend is running.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Profile & Settings
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Manage your app settings and preferences
          </Text>
        </View>

        {/* API Configuration */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              🔧 API Configuration
            </Text>
            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
              Configure the backend API URL for video analysis
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                label="API Base URL"
                value={apiUrl}
                onChangeText={setApiUrl}
                mode="outlined"
                style={styles.input}
                placeholder="http://192.168.1.3:8000"
              />
            </View>
            
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={handleUpdateApiUrl}
                style={styles.button}
              >
                Update URL
              </Button>
              <Button
                mode="outlined"
                onPress={testApiConnection}
                loading={isTesting}
                style={styles.button}
              >
                Test Connection
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Data Management */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              📊 Data Management
            </Text>
            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
              Manage your analysis history and data
            </Text>
            
            <Button
              mode="outlined"
              onPress={handleClearHistory}
              style={styles.fullButton}
            >
              Clear Analysis History
            </Button>
          </Card.Content>
        </Card>

        {/* Account */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              👤 Account
            </Text>
            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
              Manage your account settings
            </Text>
            
            <Button
              mode="outlined"
              onPress={handleLogout}
              style={styles.fullButton}
            >
              Logout
            </Button>
            <Button
              mode="outlined"
              onPress={handleDeleteAccount}
              style={[styles.fullButton, styles.deleteButton]}
              textColor="#D32F2F"
            >
              🗑️ Delete Account
            </Button>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              ⚡ Quick Actions
            </Text>
            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
              Quick access to main features
            </Text>
            
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                onPress={() => router.push('/upload')}
                style={styles.button}
              >
                Upload Video
              </Button>
              <Button
                mode="outlined"
                onPress={() => router.push('/history')}
                style={styles.button}
              >
                View History
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  fullButton: {
    marginTop: spacing.sm,
  },
  deleteButton: {
    backgroundColor: '#FFEBEE', // Light red background
    borderColor: '#EF5350', // Red border
    borderWidth: 1,
  },
}); 