import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { borderRadius, shadows, spacing } from '../src/theme';

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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Hero Section */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryContainer]}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <Text style={styles.appIcon}>🏏</Text>
          <Text style={styles.appTitle}>CrickCoach AI</Text>
          <Text style={styles.tagline}>
            Your Personal Cricket Technique Analyzer
          </Text>
          <Text style={styles.description}>
            Upload your cricket videos and get AI-powered analysis of your batting and bowling techniques with detailed biomechanical insights.
          </Text>
        </View>
      </LinearGradient>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          What You Can Do
        </Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <Surface
              key={index}
              style={[styles.featureCard, { backgroundColor: theme.colors.surface }]}
            >
              <Text style={styles.featureIcon}>{feature.icon}</Text>
              <Text style={[styles.featureTitle, { color: theme.colors.onSurface }]}>
                {feature.title}
              </Text>
              <Text style={[styles.featureDescription, { color: theme.colors.onSurfaceVariant }]}>
                {feature.description}
              </Text>
            </Surface>
          ))}
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          How It Works
        </Text>
        <Surface style={[styles.howItWorks, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
                Upload Your Video
              </Text>
              <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
                Select a cricket video from your gallery
              </Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
                AI Analysis
              </Text>
              <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
                Our AI analyzes your technique and biomechanics
              </Text>
            </View>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
                Get Results
              </Text>
              <Text style={[styles.stepDescription, { color: theme.colors.onSurfaceVariant }]}>
                Receive detailed feedback and improvement tips
              </Text>
            </View>
          </View>
        </Surface>
      </View>

      {/* CTA Section */}
      <View style={styles.section}>
        <Surface style={[styles.ctaSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.ctaTitle, { color: theme.colors.onSurface }]}>
            Ready to Improve Your Game?
          </Text>
          <Text style={[styles.ctaDescription, { color: theme.colors.onSurfaceVariant }]}>
            Start analyzing your cricket technique with AI-powered insights
          </Text>
          <TouchableOpacity
            style={[styles.getStartedButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
        </Surface>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    minHeight: screenHeight * 0.5,
    paddingTop: spacing.xxl + 20,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  appIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: screenWidth * 0.8,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  featureCard: {
    width: (screenWidth - spacing.lg * 2 - spacing.md) / 2,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.small,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  howItWorks: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.small,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaSection: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.medium,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  ctaDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  getStartedButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl * 2,
    borderRadius: borderRadius.lg,
    minWidth: 200,
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 