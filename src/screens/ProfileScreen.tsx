import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    View
} from 'react-native';
import {
    Button,
    Card,
    Divider,
    List,
    Surface,
    Text,
    TextInput,
    useTheme,
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useUpload } from '../context/UploadContext';
import apiService from '../services/api';
import { borderRadius, colors, shadows, spacing } from '../theme';

type RootStackParamList = {
  Main: undefined;
  Results: { result: any };
};

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, logout } = useAuth();
  const { uploadHistory, clearHistory } = useUpload();

  const [apiUrl, setApiUrl] = useState(apiService.getBaseURL());
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all analysis history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => clearHistory() },
      ]
    );
  };

  const handleUpdateApiUrl = () => {
    if (apiUrl.trim()) {
      apiService.updateBaseURL(apiUrl.trim());
      setShowApiSettings(false);
      Alert.alert('Success', 'API URL updated successfully');
    } else {
      Alert.alert('Error', 'Please enter a valid API URL');
    }
  };

  const testApiConnection = async () => {
    try {
      const response = await apiService.healthCheck();
      if (response.success) {
        Alert.alert('Success', 'API connection is working!');
      } else {
        Alert.alert('Error', 'Failed to connect to API');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to API');
    }
  };

  const getStats = () => {
    const totalAnalyses = uploadHistory.length;
    const battingAnalyses = uploadHistory.filter(item => item.player_type === 'batsman').length;
    const bowlingAnalyses = uploadHistory.filter(item => item.player_type === 'bowler').length;
    const issuesFound = uploadHistory.reduce((total, item) => {
      // Support both old format (flaws) and new format (technical_flaws)
      const flaws = item.result.gpt_feedback.technical_flaws || item.result.gpt_feedback.flaws || [];
      return total + flaws.length;
    }, 0);

    return { totalAnalyses, battingAnalyses, bowlingAnalyses, issuesFound };
  };

  const stats = getStats();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Profile Header */}
        <Surface style={[styles.profileHeader, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatar}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: theme.colors.onSurface }]}>
              {user?.name || 'Cricket Coach User'}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.onSurfaceVariant }]}>
              {user?.email || 'user@example.com'}
            </Text>
          </View>
        </Surface>

        {/* Statistics */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              📊 Your Statistics
            </Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
                  {stats.totalAnalyses}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Total Analyses
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.cricket.green }]}>
                  {stats.battingAnalyses}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Batting
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.cricket.blue }]}>
                  {stats.bowlingAnalyses}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Bowling
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.error }]}>
                  {stats.issuesFound}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Issues Found
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              ⚙️ Settings
            </Text>
            
            <List.Item
              title="Notifications"
              description="Receive notifications for analysis completion"
              left={props => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  color={theme.colors.primary}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="Auto Save"
              description="Automatically save analysis results"
              left={props => <List.Icon {...props} icon="content-save" />}
              right={() => (
                <Switch
                  value={autoSave}
                  onValueChange={setAutoSave}
                  color={theme.colors.primary}
                />
              )}
            />
            
            <Divider />
            
            <List.Item
              title="API Settings"
              description="Configure backend API connection"
              left={props => <List.Icon {...props} icon="api" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setShowApiSettings(!showApiSettings)}
            />
            
            {showApiSettings && (
              <View style={styles.apiSettings}>
                <TextInput
                  label="API Base URL"
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  mode="outlined"
                  style={styles.apiInput}
                />
                <View style={styles.apiButtons}>
                  <Button
                    mode="outlined"
                    onPress={testApiConnection}
                    style={styles.apiButton}
                  >
                    Test Connection
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleUpdateApiUrl}
                    style={styles.apiButton}
                  >
                    Update
                  </Button>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Data Management */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              📁 Data Management
            </Text>
            
            <List.Item
              title="Clear Analysis History"
              description={`${stats.totalAnalyses} analyses will be permanently deleted`}
              left={props => <List.Icon {...props} icon="delete-sweep" color={colors.error} />}
              onPress={handleClearHistory}
            />
            
            <Divider />
            
            <List.Item
              title="Export Data"
              description="Export your analysis data"
              left={props => <List.Icon {...props} icon="export" />}
              onPress={() => Alert.alert('Coming Soon', 'Export feature will be available soon!')}
            />
          </Card.Content>
        </Card>

        {/* About */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              ℹ️ About
            </Text>
            
            <List.Item
              title="App Version"
              description="1.0.0"
              left={props => <List.Icon {...props} icon="information" />}
            />
            
            <Divider />
            
            <List.Item
              title="Terms of Service"
              description="Read our terms and conditions"
              left={props => <List.Icon {...props} icon="file-document" />}
              onPress={() => Alert.alert('Terms of Service', 'Terms of service content...')}
            />
            
            <Divider />
            
            <List.Item
              title="Privacy Policy"
              description="Learn about our privacy practices"
              left={props => <List.Icon {...props} icon="shield-account" />}
              onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content...')}
            />
            
            <Divider />
            
            <List.Item
              title="Support"
              description="Get help and contact support"
              left={props => <List.Icon {...props} icon="help-circle" />}
              onPress={() => Alert.alert('Support', 'Contact support at support@cricketcoach.com')}
            />
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={[styles.logoutButton, { borderColor: colors.error }]}
          labelStyle={{ color: colors.error }}
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  avatarContainer: {
    marginRight: spacing.lg,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 60,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: 14,
  },
  card: {
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  apiSettings: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
  },
  apiInput: {
    marginBottom: spacing.md,
  },
  apiButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  apiButton: {
    flex: 1,
  },
  logoutButton: {
    marginTop: spacing.lg,
  },
});

export default ProfileScreen; 