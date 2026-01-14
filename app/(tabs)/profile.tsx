import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import apiService from '../../src/services/api';
import { borderRadius, shadows, spacing } from '../../src/theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { user: contextUser, logout: authLogout } = useAuth();
  const [user, setUser] = useState<any>(null);

  // Load user data from storage if not in context
  useEffect(() => {
    const loadUserData = async () => {
      if (contextUser) {
        setUser(contextUser);
      } else {
        // Try to load from storage
        try {
          const storedUser = await apiService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      }
    };
    loadUserData();
  }, [contextUser]);

  // Get username - handle both 'name' and 'username' fields
  const username = user?.username || user?.name || 'N/A';
  const displayName = user?.username || user?.name || 'User';
  
  // Generate user ID from user data (first 8 characters of id or username)
  const userId = user?.id 
    ? (typeof user.id === 'string' ? user.id.substring(0, 8) : String(user.id).padStart(8, '0').substring(0, 8)).toUpperCase()
    : (username !== 'N/A' ? username.substring(0, 8) : 'N/A').toUpperCase();
  
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
        },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.logout();
              
              if (response.success) {
                authLogout();
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Logged out successfully',
                });
                router.replace('/landing');
              } else {
                // Even if API call fails, logout locally
                authLogout();
                router.replace('/landing');
              }
            } catch (error) {
              console.error('Logout error:', error);
              // Even if API call fails, logout locally
              authLogout();
              router.replace('/landing');
            }
          }
        },
      ]
    );
  };

  const handleAccountAction = (action: string) => {
    if (action === 'Change Password') {
      router.push('/change-password');
    } else {
      Alert.alert(
        'Coming Soon',
        `${action} feature will be available soon.`,
        [{ text: 'OK' }]
      );
    }
  };

  const InfoRow = ({ icon, label, value, iconColor }: { icon: string; label: string; value: string; iconColor: string }) => (
    <View style={styles.infoRow}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Text style={[styles.iconText, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text>
      </View>
    </View>
  );

  const FeatureCard = ({ icon, title, description, iconColor }: { icon: string; title: string; description: string; iconColor: string }) => (
    <View style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.featureIconContainer, { backgroundColor: iconColor + '20' }]}>
        <Text style={[styles.featureIcon, { color: iconColor }]}>{icon}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>
      </View>
    </View>
  );

  const ActionItem = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
    <TouchableOpacity 
      style={[styles.actionItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.actionItemLeft}>
        <Text style={styles.actionIcon}>{icon}</Text>
        <Text style={[styles.actionLabel, { color: theme.colors.onSurface }]}>{label}</Text>
      </View>
      <Text style={[styles.actionArrow, { color: theme.colors.onSurfaceVariant }]}>›</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Avatar.Text 
          size={80} 
          label={displayName && displayName !== 'User' ? displayName.charAt(0).toUpperCase() : 'U'}
          style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          labelStyle={styles.avatarLabel}
        />
        <Text style={[styles.userName, { color: theme.colors.onBackground }]}>
          {displayName}
          </Text>
        <Text style={[styles.userRole, { color: theme.colors.onSurfaceVariant }]}>
          Client
          </Text>
        </View>

      {/* Account Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Account Information
        </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <InfoRow 
            icon="👤" 
            label="Username" 
            value={username} 
            iconColor="#10B981" 
          />
          <InfoRow 
            icon="✉️" 
            label="Email" 
            value={user?.email || 'N/A'} 
            iconColor="#3B82F6" 
          />
          <InfoRow 
            icon="🏷️" 
            label="User ID" 
            value={userId} 
            iconColor="#F97316" 
          />
            </View>
            </View>

      {/* App Features */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          App Features
            </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <FeatureCard
            icon="🎥"
            title="Video Analysis"
            description="Analyze your cricket technique with AI-powered biomechanical analysis"
            iconColor="#10B981"
          />
          <FeatureCard
            icon="📊"
            title="Progress Tracking"
            description="Track your improvement over time with detailed analytics and reports"
            iconColor="#3B82F6"
          />
          <FeatureCard
            icon="📈"
            title="Performance Insights"
            description="Get detailed statistics and track your cricket journey"
            iconColor="#F97316"
          />
        </View>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Account Actions
            </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <ActionItem
            icon="🔒"
            label="Change Password"
            onPress={() => handleAccountAction('Change Password')}
          />
          <ActionItem
            icon="⚙️"
            label="Settings"
            onPress={() => handleAccountAction('Settings')}
          />
          <ActionItem
            icon="❓"
            label="Help & Support"
            onPress={() => handleAccountAction('Help & Support')}
          />
          <ActionItem
            icon="📄"
            label="Privacy Policy"
            onPress={() => handleAccountAction('Privacy Policy')}
          />
          <ActionItem
            icon="ℹ️"
            label="About"
            onPress={() => handleAccountAction('About')}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
              onPress={handleLogout}
        activeOpacity={0.8}
            >
        <Text style={styles.logoutIcon}>↪</Text>
        <Text style={[styles.logoutText, { color: theme.colors.onError }]}>
              Logout
            </Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={[styles.appVersion, { color: theme.colors.onSurfaceVariant }]}>
        CricketCoach AI v1.0.0
            </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  avatar: {
    marginBottom: spacing.md,
  },
  avatarLabel: {
    fontSize: 32,
    fontWeight: '600',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  userRole: {
    fontSize: 16,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  featureCard: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  actionLabel: {
    fontSize: 16,
    flex: 1,
  },
  actionArrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  logoutIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    marginRight: spacing.sm,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  appVersion: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: spacing.md,
  },
}); 
