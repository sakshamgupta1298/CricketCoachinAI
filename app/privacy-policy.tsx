import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const lastUpdated = 'March 20, 2026';

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    setRefreshing(false);
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(18) }]}>
        {title}
      </Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.subSection}>
      <Text style={[styles.subSectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
        {title}
      </Text>
      <View style={styles.subSectionContent}>
        {children}
      </View>
    </View>
  );

  const ListItem = ({ text }: { text: string }) => (
    <View style={styles.listItem}>
      <Text style={[styles.bullet, { color: theme.colors.primary, fontSize: getResponsiveFontSize(16) }]}>•</Text>
      <Text style={[styles.listText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
        {text}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.lastUpdated, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
            Last Updated: {lastUpdated}
          </Text>
        </View>

        {/* Introduction */}
        <Section title="Introduction">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Welcome to CrickCoach AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information.
            {'\n\n'}
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application, website, and services (collectively, the "Service").
            {'\n\n'}
            We provide clear in-app notices before personal data is sent to any third-party AI provider. Those notices identify the provider and the exact data categories being sent for the selected feature.
            {'\n\n'}
            By using our Service, and where required, providing explicit consent within the app, you agree to this Privacy Policy. If you do not agree, please do not use the Service.
          </Text>
        </Section>

        {/* Information We Collect */}
        <Section title="Information We Collect">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We collect only the data necessary to provide and improve our core services.
          </Text>

          <SubSection title="1. Personal Information">
            <ListItem text="Name and email address (when registering or contacting us)" />
            <ListItem text="Organization or academy name (if applicable)" />
          </SubSection>

          <SubSection title="2. Video Content & AI Processing">
            <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
              We allow users to upload cricket videos for technique analysis.
              {'\n\n'}
              Videos are processed using our pose detection system to extract structured data such as body keypoints and movement metrics.
              {'\n\n'}
              Important:
            </Text>
            <ListItem text="Raw video files are NOT shared with third-party AI services" />
            <ListItem text="Videos are used only within our system for processing and analysis" />
            <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14), marginTop: getResponsiveSize(spacing.xs) }]}>
              After processing, only non-visual structured data may be sent to a third-party AI service to generate feedback and analysis.
              {'\n\n'}
              Specifically, when you tap "Allow" in the in-app permission prompt, we may send the following categories of data to our AI processing partner (Google Gemini, Google LLC):
              {'\n'}
              - Pose/keypoint time-series data (e.g., per-frame joint coordinates and confidence scores)
              {'\n'}
              - Derived motion/biomechanics metrics computed from those keypoints
              {'\n'}
              - Your selected coaching context (e.g., player type, playing side, shot/bowling/keeping type, requested plan length)
              {'\n'}
              - For optional features like training plans or comparisons: your prior analysis summaries/metrics needed to generate the requested output
              {'\n\n'}
              This processed data does not include your raw video file.
            </Text>
          </SubSection>

          <SubSection title="3. Usage Data">
            <ListItem text="Device type, OS version" />
            <ListItem text="App usage patterns and features used" />
            <ListItem text="Performance and analytics data" />
          </SubSection>

          <SubSection title="4. Technical Data">
            <ListItem text="IP address (for security and diagnostics)" />
            <ListItem text="Approximate location (derived from IP, not precise GPS)" />
            <ListItem text="Cookies (for web services)" />
          </SubSection>
        </Section>

        {/* How We Use Your Information */}
        <Section title="How We Use Your Information">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We use your data only for legitimate purposes, including:
          </Text>
          <ListItem text="To provide AI-based cricket coaching and analysis" />
          <ListItem text="To process videos and generate feedback" />
          <ListItem text="To improve our AI models and accuracy" />
          <ListItem text="To provide performance tracking and insights" />
          <ListItem text="To communicate updates and support responses" />
          <ListItem text="To ensure security and prevent misuse" />
          <ListItem text="To comply with legal obligations" />
          <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14), marginTop: getResponsiveSize(spacing.sm) }]}>
            Text-to-Speech: Our app may use on-device text-to-speech to read analysis results. This processing occurs locally and no data is shared externally.
          </Text>
        </Section>

        {/* User Consent */}
        <Section title="User Consent">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We respect your right to control your data.
            {'\n\n'}
            Before we send any personal data to a third-party AI service (including processed movement data derived from your video), we present an in-app notice that explains what will be shared and with whom.
            {'\n\n'}
            Users must provide explicit consent before:
          </Text>
          <View style={styles.listContainer}>
            <ListItem text="Uploading videos" />
            <ListItem text="Using AI-powered analysis features" />
            <ListItem text="Sharing processed data with third-party AI services" />
          </View>
          <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14), marginTop: getResponsiveSize(spacing.sm) }]}>
            If you do not consent, you can still use non-AI parts of the app, but features that require third-party AI processing may be unavailable.
            {'\n\n'}
            You can withdraw consent at any time by declining future AI prompts ("Cancel"), by disabling AI-sharing controls in app settings when available, or by contacting us at admin@crickcoachai.com to revoke consent for future processing and request deletion of associated data.
          </Text>
        </Section>

        {/* In-App Disclosure at Time of Use */}
        <Section title="In-App Disclosure at Time of Use">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Before any third-party AI request is made, we show an in-app permission prompt that includes:
          </Text>
          <View style={styles.listContainer}>
            <ListItem text="What data will be sent (specific categories for that feature)" />
            <ListItem text="Who will receive it (for example, our AI processing partner (Google Gemini, Google LLC))" />
            <ListItem text="Why it is needed (for example, generating technique analysis or training plans)" />
            <ListItem text="A clear choice to Allow or Cancel before any transfer occurs" />
          </View>
        </Section>

        {/* Data Sharing and Disclosure */}
        <Section title="Data Sharing and Disclosure">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We do NOT sell your data.
            {'\n\n'}
            We may share data only in the following cases:
          </Text>
          <View style={styles.listContainer}>
            <SubSection title="1. Third-Party AI Services">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                If you provide permission in the app, we may share processed movement data (pose/keypoint time-series and derived metrics) and relevant user-selected context with our AI processing partner (Google Gemini, Google LLC) to generate personalized cricket analysis, comparisons, and training plans.
              </Text>
              <View style={styles.listContainer}>
                <ListItem text="Do not receive raw video" />
                <ListItem text="Receive only the minimum data needed to generate the requested output" />
                <ListItem text="Are required to protect the data with safeguards that are equal to or stronger than those described in this policy" />
              </View>
            </SubSection>

            <SubSection title="2. Authentication Providers">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                If you choose to sign in with Google or Apple, your sign-in is handled by Google LLC or Apple Inc. We receive basic profile information (such as name and email) from those providers to create/secure your account.
              </Text>
            </SubSection>

            <SubSection title="3. Email Delivery Providers">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                If you request an email verification code or password reset, we share your email address and the email content with our email delivery provider (e.g., SMTP2GO) to send that message.
              </Text>
            </SubSection>

            <SubSection title="4. Service Providers">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                We use service providers for hosting, storage, analytics, and infrastructure operations only as needed to provide and improve the Service. These providers are contractually required to use data only for our instructed purposes and to apply protection standards equal to this Privacy Policy.
              </Text>
            </SubSection>

            <SubSection title="5. Legal Requirements">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                When required by law or government authorities
              </Text>
            </SubSection>

            <SubSection title="6. Business Transfers">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                In case of merger, acquisition, or sale (with notice)
              </Text>
            </SubSection>

            <SubSection title="7. With Your Consent">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                When you explicitly approve sharing
              </Text>
            </SubSection>
          </View>
        </Section>

        {/* Data Protection Standard */}
        <Section title="Data Protection Standard">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            All third-party service providers are contractually obligated to provide the same level of data protection as described in this Privacy Policy and in accordance with applicable privacy laws.
          </Text>
        </Section>

        {/* Data Minimization */}
        <Section title="Data Minimization">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We only collect and process data that is strictly necessary to deliver core app functionality.
          </Text>
        </Section>

        {/* Data Storage and Security */}
        <Section title="Data Storage and Security">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We implement strong security measures:
          </Text>
          <View style={styles.listContainer}>
            <ListItem text="Encryption during data transmission and storage" />
            <ListItem text="Restricted access to authorized personnel" />
            <ListItem text="Secure cloud infrastructure" />
            <ListItem text="Regular monitoring and updates" />
          </View>
        </Section>

        {/* Your Rights */}
        <Section title="Your Rights">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            You have the right to:
          </Text>
          <View style={styles.listContainer}>
            <ListItem text="Access your data" />
            <ListItem text="Correct inaccurate data" />
            <ListItem text="Request deletion" />
            <ListItem text="Object to certain processing" />
            <ListItem text="Request data portability" />
          </View>
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14), marginTop: getResponsiveSize(spacing.md) }]}>
            To exercise these rights, contact: admin@crickcoachai.com
          </Text>
        </Section>

        {/* Account Deletion */}
        <Section title="Account Deletion">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            You can request account deletion at any time. (Ensure this feature is also available inside the app to comply with Apple guidelines.)
          </Text>
        </Section>

        {/* Data Retention */}
        <Section title="Data Retention">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We retain personal data only as long as needed for the purposes described in this policy.
            {'\n\n'}
            Retention principles:
            {'\n'}
            - Account/profile data: retained while your account is active
            {'\n'}
            - Analysis inputs/outputs and related metadata: retained to provide history and app functionality, unless you request deletion earlier
            {'\n'}
            - Security and operational logs: retained for limited periods required for abuse prevention, diagnostics, and legal compliance
            {'\n\n'}
            Upon account deletion or verified deletion request, personal data is deleted or irreversibly anonymized within 30 days, except where a longer period is required by law.
          </Text>
        </Section>

        {/* Children's Privacy */}
        <Section title="Children’s Privacy">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Our service is not intended for children under 13. We do not knowingly collect data from children. If detected, it will be deleted immediately.
          </Text>
        </Section>

        {/* International Data Transfers */}
        <Section title="International Data Transfers">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Your data may be processed in countries outside your location. We ensure appropriate safeguards are in place.
          </Text>
        </Section>

        {/* Changes to This Privacy Policy */}
        <Section title="Changes to This Privacy Policy">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We may update this policy periodically. Updates will be posted with a revised "Last Updated" date.
          </Text>
        </Section>

        {/* Contact Us */}
        <Section title="Contact Us">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </Text>
          <Text style={[styles.contactInfo, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Email: admin@crickcoachai.com
            {'\n\n'}
            Website: www.crickcoachai.com
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
  lastUpdated: {
    marginTop: getResponsiveSize(spacing.xs),
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
    lineHeight: getResponsiveSize(22),
    marginBottom: getResponsiveSize(spacing.sm),
    // fontSize set dynamically
  },
  listContainer: {
    marginTop: getResponsiveSize(spacing.sm),
  },
  subSection: {
    marginBottom: getResponsiveSize(spacing.md),
    marginLeft: getResponsiveSize(spacing.sm),
  },
  subSectionTitle: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.xs),
    marginTop: getResponsiveSize(spacing.sm),
    // fontSize set dynamically
  },
  subSectionContent: {
    // fontSize set dynamically
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: getResponsiveSize(spacing.xs),
    paddingLeft: getResponsiveSize(spacing.sm),
  },
  bullet: {
    marginRight: getResponsiveSize(spacing.sm),
    fontWeight: 'bold',
    // fontSize set dynamically
  },
  listText: {
    flex: 1,
    lineHeight: getResponsiveSize(20),
    // fontSize set dynamically
  },
  contactInfo: {
    lineHeight: getResponsiveSize(22),
    // fontSize set dynamically
  },
});

