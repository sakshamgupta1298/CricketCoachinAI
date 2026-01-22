import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { shadows, spacing } from '../src/theme';
import {
  getHeightPercentage,
  getResponsiveFontSize,
  getResponsiveSize,
  getWidthPercentage,
  screenWidth
} from '../src/utils/responsive';

export default function LandingScreen() {
  const theme = useTheme();
  
  // Responsive dimensions
  const iconSize = getResponsiveSize(180);
  const iconMarginTop = getResponsiveSize(30);
  const titleMarginTop = getResponsiveSize(-40);

  const features = [
    {
      icon: '🏏',
      title: 'Batting Analysis',
      description: 'AI-powered shot analysis with biomechanical insights',
    },
    {
      icon: '🎯',
      title: 'Bowling Analysis',
      description: 'Comprehensive bowling technique evaluation',
    },
    {
      icon: '⚡',
      title: 'Instant Feedback',
      description: 'Get detailed analysis and improvement tips',
    },
    {
      icon: '📈',
      title: 'Progress Tracking',
      description: 'Monitor your improvement over time',
    },
  ];

  const handleGetStarted = () => {
    router.push('/login');
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.heroContent}
        >
          <Animated.View 
            entering={FadeInUp.delay(200).springify()}
            style={styles.iconContainer}
          >
            <Image
              source={require('../assets/images/logo-icon.png')}
              style={[styles.appIcon, { width: iconSize, height: iconSize, marginTop: iconMarginTop }]}
              contentFit="contain"
            />
          </Animated.View>
          <Animated.Text 
            entering={FadeInDown.delay(300).springify()}
            style={[styles.appTitle, { fontSize: getResponsiveFontSize(42), marginTop: titleMarginTop }]}
          >
            CrickCoach AI
          </Animated.Text>
          <Animated.Text 
            entering={FadeInDown.delay(400).springify()}
            style={[styles.tagline, { fontSize: getResponsiveFontSize(18) }]}
          >
            Your Personal AI-Powered Cricket Coach
          </Animated.Text>
          <Animated.Text 
            entering={FadeInDown.delay(500).springify()}
            style={[styles.description, { fontSize: getResponsiveFontSize(17), maxWidth: getWidthPercentage(85) }]}
          >
            Upload your cricket videos and get AI-powered analysis of your batting and bowling techniques with detailed biomechanical insights.
          </Animated.Text>
        </Animated.View>
      </LinearGradient>

      {/* Features Section */}
      <View style={styles.section}>
        <Animated.Text 
          entering={FadeInUp.delay(100).springify()}
          style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}
        >
          What You Can Do
        </Animated.Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <PremiumCard
              key={index}
              variant="elevated"
              padding="medium"
              animated
              delay={200 + index * 100}
              style={styles.featureCard}
            >
              <View style={styles.featureContent}>
                <Text style={[styles.featureIcon, { fontSize: getResponsiveSize(48) }]}>{feature.icon}</Text>
                <Text style={[styles.featureTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(17) }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
                  {feature.description}
                </Text>
              </View>
            </PremiumCard>
          ))}
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Animated.Text 
          entering={FadeInUp.delay(100).springify()}
          style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}
        >
          How It Works
        </Animated.Text>
        <PremiumCard variant="elevated" padding="large" animated delay={200}>
          {[1, 2, 3].map((stepNum, index) => {
            const step = index === 0 
              ? { title: 'Upload Your Video', description: 'Select a cricket video from your gallery' }
              : index === 1
              ? { title: 'AI Analysis', description: 'Our AI analyzes your technique and biomechanics' }
              : { title: 'Get Results', description: 'Receive detailed feedback and improvement tips' };
            
            return (
              <Animated.View 
                key={stepNum}
                entering={FadeInDown.delay(300 + index * 100).springify()}
                style={[styles.step, index < 2 && styles.stepBorder]}
              >
                <View style={[styles.stepNumber, { 
                  backgroundColor: theme.colors.primary,
                  width: getResponsiveSize(48),
                  height: getResponsiveSize(48),
                  borderRadius: getResponsiveSize(24),
                }]}>
                  <Text style={[styles.stepNumberText, { fontSize: getResponsiveFontSize(20) }]}>{stepNum}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(19) }]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(15) }]}>
                    {step.description}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </PremiumCard>
      </View>

      {/* CTA Section */}
      <View style={styles.section}>
        <PremiumCard variant="elevated" padding="large" animated delay={200}>
          <Animated.Text 
            entering={FadeInUp.delay(300).springify()}
            style={[styles.ctaTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(28) }]}
          >
            Ready to Improve Your Game?
          </Animated.Text>
          <Animated.Text 
            entering={FadeInUp.delay(400).springify()}
            style={[styles.ctaDescription, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(17) }]}
          >
            Start analyzing your cricket technique with AI-powered insights
          </Animated.Text>
          <Animated.View 
            entering={FadeInUp.delay(500).springify()}
            style={styles.ctaButtonContainer}
          >
            <PremiumButton
              title="Get Started"
              onPress={handleGetStarted}
              variant="primary"
              size="large"
              fullWidth
            />
          </Animated.View>
        </PremiumCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    minHeight: getHeightPercentage(55),
    paddingTop: getResponsiveSize(spacing.xl),
    paddingBottom: getResponsiveSize(spacing.xxl + 20),
    paddingHorizontal: getResponsiveSize(spacing.lg),
    justifyContent: 'flex-start',
  },
  heroContent: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIcon: {
    // width, height, marginTop set dynamically
  },
  appTitle: {
    fontWeight: '600',
    color: 'white',
    marginBottom: getResponsiveSize(spacing.xs),
    textAlign: 'center',
    letterSpacing: -0.5,
    // fontSize and marginTop set dynamically
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: getResponsiveSize(spacing.xxl),
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.3,
    fontStyle: 'italic',
    // fontSize set dynamically
  },
  description: {
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: getResponsiveSize(26),
    paddingHorizontal: getResponsiveSize(spacing.md),
    // fontSize and maxWidth set dynamically
  },
  section: {
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.xl),
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.lg),
    textAlign: 'center',
    letterSpacing: -0.3,
    // fontSize set dynamically
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: getResponsiveSize(spacing.md),
  },
  featureCard: {
    width: (screenWidth - getResponsiveSize(spacing.lg) * 2 - getResponsiveSize(spacing.md)) / 2,
    minHeight: getResponsiveSize(160),
  },
  featureContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    marginBottom: getResponsiveSize(spacing.md),
    // fontSize set dynamically
  },
  featureTitle: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.xs),
    letterSpacing: 0.2,
    // fontSize set dynamically
  },
  featureDescription: {
    textAlign: 'center',
    lineHeight: getResponsiveSize(18),
    // fontSize set dynamically
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: getResponsiveSize(spacing.md),
  },
  stepBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: getResponsiveSize(spacing.md),
  },
  stepNumber: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSize(spacing.md),
    ...shadows.sm,
    // width, height, borderRadius set dynamically
  },
  stepNumberText: {
    color: 'white',
    fontWeight: '700',
    // fontSize set dynamically
  },
  stepContent: {
    flex: 1,
    paddingTop: getResponsiveSize(spacing.xs),
  },
  stepTitle: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.xs),
    letterSpacing: 0.2,
    // fontSize set dynamically
  },
  stepDescription: {
    lineHeight: getResponsiveSize(22),
    // fontSize set dynamically
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
    marginTop: spacing.md,
  },
}); 