import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import apiService from '../../src/services/api';
import { borderRadius, colors, spacing } from '../../src/theme';

export default function HomeScreen() {
  const theme = useTheme();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState([
    {
      label: 'Total Analyses',
      value: '0',
      icon: '📊',
      color: colors.cricket.green,
    },
    {
      label: 'This Month',
      value: '0',
      icon: '📅',
      color: colors.cricket.blue,
    },
    {
      label: 'Improvement',
      value: '0%',
      icon: '📈',
      color: colors.cricket.orange,
    },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
    loadAnalysisStats();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = await apiService.getStoredUser();
      setUser(userData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAnalysisStats = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAnalysisHistory();
      
      if (response.success && response.data) {
        const history = response.data;
        const totalAnalyses = history.length;
        
        // Calculate analyses this month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const thisMonthAnalyses = history.filter((item: any) => {
          const itemDate = new Date(item.created);
          return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
        }).length;
        
        // Calculate improvement (comparing this month to last month)
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthAnalyses = history.filter((item: any) => {
          const itemDate = new Date(item.created);
          return itemDate.getMonth() === lastMonth && itemDate.getFullYear() === lastMonthYear;
        }).length;
        
        let improvement = '0%';
        if (lastMonthAnalyses > 0) {
          const improvementValue = Math.round(((thisMonthAnalyses - lastMonthAnalyses) / lastMonthAnalyses) * 100);
          improvement = `${improvementValue >= 0 ? '+' : ''}${improvementValue}%`;
        } else if (thisMonthAnalyses > 0) {
          improvement = `+${thisMonthAnalyses * 100}%`;
        }
        
        setStats([
          {
            label: 'Total Analyses',
            value: totalAnalyses.toString(),
            icon: '📊',
            color: colors.cricket.green,
          },
          {
            label: 'This Month',
            value: thisMonthAnalyses.toString(),
            icon: '📅',
            color: colors.cricket.blue,
          },
          {
            label: 'Improvement',
            value: improvement,
            icon: '📈',
            color: colors.cricket.orange,
          },
        ]);
      }
    } catch (error) {
      console.error('Error loading analysis stats:', error);
    } finally {
      setLoading(false);
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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header with Gradient */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.headerContent}
        >
          <Text style={styles.greeting}>
            Welcome back{user ? `, ${user.username}` : ''}!
          </Text>
          <Text style={styles.subtitle}>
            Ready to improve your cricket game?
          </Text>
        </Animated.View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Animated.Text 
          entering={FadeInUp.delay(200).springify()}
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Quick Actions
        </Animated.Text>
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 100).springify()}
            >
              <TouchableOpacity
                style={styles.actionCard}
                onPress={action.action}
                activeOpacity={0.8}
              >
                <PremiumCard 
                  variant="elevated" 
                  padding="medium"
                  style={[
                    styles.actionCardInner,
                    { borderLeftWidth: 4, borderLeftColor: action.color }
                  ]}
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
                </PremiumCard>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Animated.Text 
          entering={FadeInUp.delay(200).springify()}
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Your Progress
        </Animated.Text>
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 100).springify()}
              style={styles.statCardWrapper}
            >
              <PremiumCard 
                variant="elevated" 
                padding="large" 
                style={[
                  styles.statCard,
                  { borderTopWidth: 3, borderTopColor: stat.color }
                ]}
              >
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
                    <Text style={styles.statIcon}>{stat.icon}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.colors.onSurface }]}>
                    {stat.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {stat.label}
                  </Text>
                </View>
              </PremiumCard>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Quick Start CTA */}
      <View style={styles.section}>
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.ctaCard}>
            <Text style={[styles.ctaTitle, { color: theme.colors.onSurface }]}>
              Start Your Analysis
            </Text>
            <Text style={[styles.ctaDescription, { color: theme.colors.onSurfaceVariant }]}>
              Upload a cricket video and get instant AI-powered feedback on your technique
            </Text>
            <View style={styles.ctaButtonContainer}>
              <PremiumButton
                title="Upload Video"
                onPress={() => router.push('/upload')}
                variant="primary"
                size="large"
                fullWidth
              />
            </View>
          </PremiumCard>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: spacing.xs,
    color: 'white',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  section: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.lg,
    letterSpacing: -0.3,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
  },
  actionCardInner: {
    alignItems: 'center',
    minHeight: 160,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statCardWrapper: {
    flex: 1,
  },
  statCard: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  ctaCard: {
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  ctaDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  ctaButtonContainer: {
    width: '100%',
  },
}); 
