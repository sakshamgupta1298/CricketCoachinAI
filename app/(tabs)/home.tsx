import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import apiService from '../../src/services/api';
import { colors, spacing } from '../../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../../src/utils/responsive';

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
      
      console.log('📊 [HOME] Analysis history response:', response);
      
      if (response.success && response.data) {
        // Ensure data is an array
        const history = Array.isArray(response.data) ? response.data : [];
        console.log('📊 [HOME] History array length:', history.length);
        console.log('📊 [HOME] History items:', history);
        
        const totalAnalyses = history.length;
        
        // Calculate analyses this month
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const thisMonthAnalyses = history.filter((item: any) => {
          if (!item || !item.created) return false;
          try {
            const itemDate = new Date(item.created);
            return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
          } catch (e) {
            console.error('Error parsing date:', item.created, e);
            return false;
          }
        }).length;
        
        console.log('📊 [HOME] Total analyses:', totalAnalyses);
        console.log('📊 [HOME] This month analyses:', thisMonthAnalyses);
        
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
        ]);
      } else {
        console.warn('📊 [HOME] No data or unsuccessful response:', response);
        // Set to 0 if no data
        setStats([
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
        ]);
      }
    } catch (error) {
      console.error('❌ [HOME] Error loading analysis stats:', error);
      // Set to 0 on error
      setStats([
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
      ]);
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
          <Text style={[styles.greeting, { fontSize: getResponsiveFontSize(27) }]}>
            Welcome back{user ? `, ${user.username}` : ''}!
          </Text>
          <Text style={[styles.subtitle, { fontSize: getResponsiveFontSize(14) }]}>
            Ready to improve your cricket game?
          </Text>
        </Animated.View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Animated.Text 
          entering={FadeInUp.delay(200).springify()}
          style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(20) }]}
        >
          Quick Actions
        </Animated.Text>
        <View style={styles.quickActions}>
          {quickActions.map((action, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(300 + index * 100).springify()}
              style={styles.actionCardWrapper}
            >
              <TouchableOpacity
                style={styles.actionCard}
                onPress={action.action}
                activeOpacity={0.8}
              >
                <PremiumCard 
                  variant="elevated" 
                  padding="medium"
                  style={StyleSheet.flatten([
                    styles.actionCardInner,
                    { borderLeftWidth: 4, borderLeftColor: action.color }
                  ])}
                >
                  <View style={[styles.actionIconContainer, { 
                    backgroundColor: action.color + '20',
                    width: getResponsiveSize(64),
                    height: getResponsiveSize(64),
                    borderRadius: getResponsiveSize(32),
                  }]}>
                    <Text style={[styles.actionIcon, { fontSize: getResponsiveSize(24) }]}>{action.icon}</Text>
                  </View>
                  <Text style={[styles.actionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                    {action.title}
                  </Text>
                  <Text style={[styles.actionSubtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(11) }]}>
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
          style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(20) }]}
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
                style={StyleSheet.flatten([
                  styles.statCard,
                  { borderTopWidth: 3, borderTopColor: stat.color }
                ])}
              >
                <View style={styles.statContent}>
                  <View style={[styles.statIconContainer, { 
                    backgroundColor: stat.color + '15',
                    width: getResponsiveSize(48),
                    height: getResponsiveSize(48),
                    borderRadius: getResponsiveSize(24),
                  }]}>
                    <Text style={[styles.statIcon, { fontSize: getResponsiveSize(20) }]}>{stat.icon}</Text>
                  </View>
                  <Text style={[styles.statValue, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(18) }]}>
                    {stat.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(10) }]}>
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
            <Text style={[styles.ctaTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              Start Your Analysis
            </Text>
            <Text style={[styles.ctaDescription, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
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
    paddingTop: getResponsiveSize(spacing.xxl + 20),
    paddingBottom: getResponsiveSize(spacing.xl),
    paddingHorizontal: getResponsiveSize(spacing.lg),
  },
  headerContent: {
    paddingBottom: getResponsiveSize(spacing.md),
  },
  greeting: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.xs),
    color: 'white',
    letterSpacing: -0.5,
    // fontSize set dynamically
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    // fontSize set dynamically
  },
  section: {
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.xl),
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.lg),
    letterSpacing: -0.3,
    // fontSize set dynamically
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(spacing.md),
  },
  actionCardWrapper: {
    flex: 1,
  },
  actionCard: {
    flex: 1,
  },
  actionCardInner: {
    alignItems: 'center',
    minHeight: getResponsiveSize(160),
  },
  actionIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.md),
    // width, height, borderRadius set dynamically
  },
  actionIcon: {
    // fontSize set dynamically
  },
  actionTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.xs),
    letterSpacing: 0.2,
    // fontSize set dynamically
  },
  actionSubtitle: {
    textAlign: 'center',
    lineHeight: getResponsiveSize(18),
    // fontSize set dynamically
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(spacing.md),
  },
  statCardWrapper: {
    flex: 1,
  },
  statCard: {
    height: getResponsiveSize(130),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  statIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.sm),
    // width, height, borderRadius set dynamically
  },
  statIcon: {
    // fontSize set dynamically
  },
  statValue: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.xs),
    letterSpacing: -0.3,
    textAlign: 'center',
    // fontSize set dynamically
  },
  statLabel: {
    lineHeight: getResponsiveSize(16),
    textAlign: 'center',
    fontWeight: '500',
    // fontSize set dynamically
  },
  ctaCard: {
    alignItems: 'center',
  },
  ctaTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.sm),
    letterSpacing: -0.3,
    // fontSize set dynamically
  },
  ctaDescription: {
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.xl),
    lineHeight: getResponsiveSize(24),
    // fontSize set dynamically
  },
  ctaButtonContainer: {
    width: '100%',
  },
}); 
