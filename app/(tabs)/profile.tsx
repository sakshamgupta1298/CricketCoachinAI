import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Avatar, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../src/context/AuthContext';
import apiService from '../../src/services/api';
import { borderRadius, shadows, spacing } from '../../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../../src/utils/responsive';

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
    } else if (action === 'Privacy Policy') {
      router.push('/privacy-policy');
    } else if (action === 'About') {
      router.push('/about');
    } else if (action === 'Help & Support') {
      router.push('/help-and-support');
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
      <View style={[styles.iconContainer, { 
        backgroundColor: iconColor + '20',
        width: getResponsiveSize(40),
        height: getResponsiveSize(40),
      }]}>
        <Text style={[styles.iconText, { color: iconColor, fontSize: getResponsiveSize(18) }]}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(10) }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>{value}</Text>
      </View>
    </View>
  );

  const FeatureCard = ({ icon, title, description, iconColor }: { icon: string; title: string; description: string; iconColor: string }) => (
    <View style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}>
      <View style={[styles.featureIconContainer, { 
        backgroundColor: iconColor + '20',
        width: getResponsiveSize(48),
        height: getResponsiveSize(48),
      }]}>
        <Text style={[styles.featureIcon, { color: iconColor, fontSize: getResponsiveSize(20) }]}>{icon}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={[styles.featureTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>{description}</Text>
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
        <Text style={[styles.actionIcon, { fontSize: getResponsiveSize(18) }]}>{icon}</Text>
        <Text style={[styles.actionLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>{label}</Text>
      </View>
      <Text style={[styles.actionArrow, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(20) }]}>›</Text>
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
          size={getResponsiveSize(80)} 
          label={displayName && displayName !== 'User' ? displayName.charAt(0).toUpperCase() : 'U'}
          style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
          labelStyle={[styles.avatarLabel, { fontSize: getResponsiveFontSize(32) }]}
        />
        <Text style={[styles.userName, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(24) }]}>
          {displayName}
          </Text>
        <Text style={[styles.userRole, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(16) }]}>
          Client
          </Text>
        </View>

      {/* Account Information */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(17) }]}>
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
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(17) }]}>
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
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(17) }]}>
          Account Actions
            </Text>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <ActionItem
            icon="🔒"
            label="Change Password"
            onPress={() => handleAccountAction('Change Password')}
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
        <Text style={[styles.logoutIcon, { fontSize: getResponsiveSize(18) }]}>↪</Text>
        <Text style={[styles.logoutText, { color: theme.colors.onError, fontSize: getResponsiveFontSize(14) }]}>
          Logout
        </Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={[styles.appVersion, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
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
    padding: getResponsiveSize(spacing.lg),
    paddingBottom: getResponsiveSize(spacing.xxl),
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.xl),
    marginTop: getResponsiveSize(spacing.md),
  },
  avatar: {
    marginBottom: getResponsiveSize(spacing.md),
  },
  avatarLabel: {
    fontWeight: '600',
    // fontSize set dynamically
  },
  userName: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  userRole: {
    // fontSize set dynamically
  },
  section: {
    marginBottom: getResponsiveSize(spacing.xl),
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.md),
    // fontSize set dynamically
  },
  card: {
    borderRadius: borderRadius.md,
    padding: getResponsiveSize(spacing.md),
    ...shadows.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.md),
  },
  iconContainer: {
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getResponsiveSize(spacing.md),
    // width, height set dynamically
  },
  iconText: {
    // fontSize set dynamically
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  infoValue: {
    fontWeight: '500',
    // fontSize set dynamically
  },
  featureCard: {
    flexDirection: 'row',
    padding: getResponsiveSize(spacing.md),
    borderRadius: borderRadius.sm,
    marginBottom: getResponsiveSize(spacing.md),
  },
  featureIconContainer: {
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: getResponsiveSize(spacing.md),
    // width, height set dynamically
  },
  featureIcon: {
    // fontSize set dynamically
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  featureDescription: {
    lineHeight: getResponsiveSize(20),
    // fontSize set dynamically
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsiveSize(spacing.md),
    borderRadius: borderRadius.sm,
    marginBottom: getResponsiveSize(spacing.sm),
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    marginRight: getResponsiveSize(spacing.md),
    // fontSize set dynamically
  },
  actionLabel: {
    flex: 1,
    // fontSize set dynamically
  },
  actionArrow: {
    fontWeight: '300',
    // fontSize set dynamically
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(spacing.md),
    borderRadius: borderRadius.md,
    marginTop: getResponsiveSize(spacing.lg),
    marginBottom: getResponsiveSize(spacing.md),
  },
  logoutIcon: {
    color: '#FFFFFF',
    marginRight: getResponsiveSize(spacing.sm),
    // fontSize set dynamically
  },
  logoutText: {
    fontWeight: '600',
    // fontSize set dynamically
  },
  appVersion: {
    textAlign: 'center',
    marginTop: getResponsiveSize(spacing.md),
    // fontSize set dynamically
  },
}); 
