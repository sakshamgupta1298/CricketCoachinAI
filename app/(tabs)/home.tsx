import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Surface, Text, useTheme } from 'react-native-paper';
import apiService from '../../src/services/api';
import { borderRadius, colors, shadows, spacing } from '../../src/theme';

export default function HomeScreen() {
  const theme = useTheme();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await apiService.getStoredUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const quickActions = [
    {
      title: 'Upload Video',
      subtitle: 'Select from gallery',
      icon: '📤',
      action: () => router.push('/upload'),
      color: colors.cricket.green,
    },
    {
      title: 'View History',
      subtitle: 'Past analyses',
      icon: '📋',
      action: () => router.push('/history'),
      color: colors.cricket.blue,
    },
  ];

  const stats = [
    {
      label: 'Total Analyses',
      value: '12',
      icon: '📊',
      color: colors.cricket.green,
    },
    {
      label: 'This Month',
      value: '3',
      icon: '📅',
      color: colors.cricket.blue,
    },
    {
      label: 'Improvement',
      value: '+15%',
      icon: '📈',
      color: colors.cricket.orange,
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: theme.colors.onSurface }]}>
              Welcome back{user ? `, ${user.username}` : ''}!
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Ready to improve your cricket game?
            </Text>
          </View>
        </View>
      </Surface>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Quick Actions
        </Text>
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
              onPress={action.action}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <Text style={[styles.actionTitle, { color: theme.colors.onSurface }]}>
                {action.title}
              </Text>
              <Text style={[styles.actionSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {action.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Your Progress
        </Text>
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <Surface
              key={index}
              style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
            >
              <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
              </View>
              <View style={styles.statContent}>
                <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {stat.label}
                </Text>
              </View>
            </Surface>
          ))}
        </View>
      </View>

      {/* Quick Start CTA */}
      <View style={styles.section}>
        <Surface style={[styles.ctaCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.ctaTitle, { color: theme.colors.onSurface }]}>
            Start Your Analysis
          </Text>
          <Text style={[styles.ctaDescription, { color: theme.colors.onSurfaceVariant }]}>
            Upload a cricket video and get instant AI-powered feedback on your technique
          </Text>
          <Button
            mode="contained"
            onPress={() => router.push('/upload')}
            style={styles.ctaButton}
            contentStyle={styles.ctaButtonContent}
            labelStyle={styles.ctaButtonLabel}
          >
            Upload Video
          </Button>
        </Surface>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.sm,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  actionSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.small,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  statIcon: {
    fontSize: 18,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
  },
  ctaCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  ctaDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  ctaButton: {
    borderRadius: borderRadius.lg,
  },
  ctaButtonContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  ctaButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 
