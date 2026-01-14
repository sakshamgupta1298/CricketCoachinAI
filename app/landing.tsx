import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { shadows, spacing } from '../src/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LandingScreen() {
  const theme = useTheme();

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
              style={styles.appIcon}
              contentFit="contain"
            />
          </Animated.View>
          <Animated.Text 
            entering={FadeInDown.delay(300).springify()}
            style={styles.appTitle}
          >
            CrickCoach AI
          </Animated.Text>
          <Animated.Text 
            entering={FadeInDown.delay(400).springify()}
            style={styles.tagline}
          >
            Your Personal AI-Powered Cricket Coach
          </Animated.Text>
          <Animated.Text 
            entering={FadeInDown.delay(500).springify()}
            style={styles.description}
          >
            Upload your cricket videos and get AI-powered analysis of your batting and bowling techniques with detailed biomechanical insights.
          </Animated.Text>
        </Animated.View>
      </LinearGradient>

      {/* Features Section */}
      <View style={styles.section}>
        <Animated.Text 
          entering={FadeInUp.delay(100).springify()}
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
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
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
                  {feature.title}
                </Text>
                <Text style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant }]}>
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
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
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
                <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.stepNumberText}>{stepNum}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
                    {step.title}
                  </Text>
                  <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
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
            style={[styles.ctaTitle, { color: theme.colors.onSurface }]}
          >
            Ready to Improve Your Game?
          </Animated.Text>
          <Animated.Text 
            entering={FadeInUp.delay(400).springify()}
            style={[styles.ctaDescription, { color: theme.colors.onSurfaceVariant }]}
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
    minHeight: screenHeight * 0.55,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl + 20,
    paddingHorizontal: spacing.lg,
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
    width: 180,
    height: 180,
    marginTop: 30,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: '600',
    color: 'white',
    marginTop: -40,
    marginBottom: spacing.xs,
    textAlign: 'center',
    letterSpacing: -0.5,
    // fontStyle: 'italic',
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: spacing.xxl,
    textAlign: 'center',
    fontWeight: '300',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: screenWidth * 0.85,
    paddingHorizontal: spacing.md,
    // fontStyle: 'italic',
  },
  section: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: spacing.lg,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  featureCard: {
    width: (screenWidth - spacing.lg * 2 - spacing.md) / 2,
    minHeight: 160,
  },
  featureContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  featureDescription: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  stepBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    ...shadows.sm,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
    paddingTop: spacing.xs,
  },
  stepTitle: {
    fontSize: 19,
    fontWeight: '600',
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  ctaDescription: {
    fontSize: 17,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  ctaButtonContainer: {
    width: '100%',
    marginTop: spacing.md,
  },
}); 