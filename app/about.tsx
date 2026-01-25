import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function AboutScreen() {
  const theme = useTheme();

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(20) }]}>
        {title}
      </Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}>
            About Us
          </Text>
        </View>

        {/* CrickCoach AI Introduction */}
        <Section title="CrickCoach AI">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            CrickCoach AI is an AI-powered mobile application built to transform the way cricketers train and improve. By simply uploading a video, players receive personalized, data-driven analysis of their technique—whether batting or bowling—helping them identify flaws, reduce injury risk, and unlock better performance.
            {'\n\n'}
            Designed for cricketers of all levels—from beginners taking their first steps to professionals fine-tuning elite skills—CrickCoach AI makes expert-level coaching accessible to everyone. The platform also supports coaches, academies, clubs, teams, and parents of young players by providing consistent, objective, and easy-to-understand feedback.
            {'\n\n'}
            With CrickCoach AI, professional cricket coaching is no longer limited by location, time, or resources. Our intelligent analysis delivers instant insights directly to your mobile device, empowering players to train smarter, correct techniques faster, and elevate their game anytime, anywhere.
          </Text>
        </Section>

        {/* Our Mission */}
        <Section title="Our Mission">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Our mission is simple: to democratize high-quality cricket coaching through technology. We aim to bridge the gap between talent and opportunity by using AI to deliver reliable, actionable, and affordable performance analysis to every cricketer who dreams of getting better.
          </Text>
        </Section>

        {/* About the Founder */}
        <Section title="About the Founder">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            CrickCoach AI is founded by a passionate state-level cricketer who understands the game from the inside out. Having competed at the state level, the founder has experienced firsthand the challenges players face—limited access to expert coaching, lack of consistent feedback, and the difficulty of identifying technical mistakes at the right time.
            {'\n\n'}
            This deep connection to the sport, combined with a strong belief in the power of technology, led to the creation of CrickCoach AI. The vision was clear: build a tool that brings professional-level analysis to every player, regardless of where they train or who they train with.
          </Text>
          <Text style={[styles.highlightText, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(15) }]}>
            {'\n'}
            CrickCoach AI is not just a product—it's built by a cricketer, for cricketers.
          </Text>
        </Section>
      </View>
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
  content: {
    flex: 1,
  },
  header: {
    marginBottom: getResponsiveSize(spacing.xl),
    marginTop: getResponsiveSize(spacing.md),
  },
  title: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.xs),
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
  sectionContent: {
    // fontSize set dynamically
  },
  textContent: {
    lineHeight: getResponsiveSize(24),
    // fontSize set dynamically
  },
  highlightText: {
    lineHeight: getResponsiveSize(26),
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginTop: getResponsiveSize(spacing.sm),
    // fontSize set dynamically
  },
});

