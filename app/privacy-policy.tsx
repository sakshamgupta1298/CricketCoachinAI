import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function PrivacyPolicyScreen() {
  const theme = useTheme();

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
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}>
            Privacy Policy
          </Text>
          <Text style={[styles.lastUpdated, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
            Last Updated: {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Introduction */}
        <Section title="Introduction">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Welcome to CrickCoach AI ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application, website, and services (collectively, the "Service").
            {'\n\n'}
            By using our Service, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our Service.
          </Text>
        </Section>

        {/* Information We Collect */}
        <Section title="Information We Collect">
          <SubSection title="1. Personal Information">
            <ListItem text="Name and email address when you register or contact us" />
            <ListItem text="Organization or academy name (if applicable)" />
            <ListItem text="Contact information provided through partnership inquiries" />
          </SubSection>

          <SubSection title="2. Video Content">
            <ListItem text="Cricket technique videos you upload for analysis" />
            <ListItem text="Video metadata (duration, file size, format)" />
            <ListItem text="Analysis results and performance metrics generated from your videos" />
          </SubSection>

          <SubSection title="3. Usage Data">
            <ListItem text="Device information (model, operating system, unique device identifiers)" />
            <ListItem text="App usage patterns and features accessed" />
            <ListItem text="Performance analytics and improvement tracking data" />
          </SubSection>

          <SubSection title="4. Technical Information">
            <ListItem text="IP address and location data" />
            <ListItem text="Browser type and version (for web services)" />
            <ListItem text="Cookies and similar tracking technologies" />
          </SubSection>
        </Section>

        {/* How We Use Your Information */}
        <Section title="How We Use Your Information">
          <ListItem text="To provide, maintain, and improve our AI-powered cricket coaching services" />
          <ListItem text="To analyze your cricket technique videos and generate personalized feedback" />
          <ListItem text="To send you APK downloads, updates, and service-related communications" />
          <ListItem text="To respond to your inquiries, partnership requests, and provide customer support" />
          <ListItem text="To track your progress and provide performance analytics over time" />
          <ListItem text="To enhance our AI models and improve analysis accuracy" />
          <ListItem text="To detect, prevent, and address technical issues and security threats" />
          <ListItem text="To comply with legal obligations and enforce our terms of service" />
        </Section>

        {/* Data Storage and Security */}
        <Section title="Data Storage and Security">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We implement appropriate technical and organizational security measures to protect your personal information and video content. However, no method of transmission over the internet or electronic storage is 100% secure.
          </Text>
          <View style={styles.listContainer}>
            <ListItem text="Your videos are encrypted during transmission and storage" />
            <ListItem text="Access to your data is restricted to authorized personnel only" />
            <ListItem text="We use secure servers and follow industry-standard security practices" />
            <ListItem text="Regular security audits and updates are performed" />
          </View>
        </Section>

        {/* Data Sharing and Disclosure */}
        <Section title="Data Sharing and Disclosure">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We do not sell your personal information or video content. We may share your information only in the following circumstances:
          </Text>
          <View style={styles.listContainer}>
            <SubSection title="Service Providers:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                With trusted third-party service providers who assist in operating our Service (e.g., cloud storage, email services, analytics)
              </Text>
            </SubSection>

            <SubSection title="Legal Requirements:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                When required by law, court order, or government regulation
              </Text>
            </SubSection>

            <SubSection title="Business Transfers:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                In connection with a merger, acquisition, or sale of assets (with notice to users)
              </Text>
            </SubSection>

            <SubSection title="With Your Consent:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                When you explicitly authorize us to share your information
              </Text>
            </SubSection>

            <SubSection title="Coaches/Academies:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                If you are part of a coaching program, your data may be shared with your authorized coach or academy
              </Text>
            </SubSection>
          </View>
        </Section>

        {/* Your Rights */}
        <Section title="Your Rights">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            You have the following rights regarding your personal information:
          </Text>
          <View style={styles.listContainer}>
            <ListItem text="Access: Request a copy of your personal data" />
            <ListItem text="Correction: Request correction of inaccurate or incomplete information" />
            <ListItem text="Deletion: Request deletion of your personal data and videos" />
            <ListItem text="Portability: Request transfer of your data to another service" />
            <ListItem text="Opt-out: Unsubscribe from marketing communications" />
            <ListItem text="Objection: Object to processing of your data for certain purposes" />
          </View>
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14), marginTop: getResponsiveSize(spacing.md) }]}>
            To exercise these rights, please contact us at admin@crickcoachai.com
          </Text>
        </Section>

        {/* Cookies and Tracking Technologies */}
        <Section title="Cookies and Tracking Technologies">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We use cookies and similar tracking technologies to track activity on our Service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            {'\n\n'}
            Types of cookies we use:
          </Text>
          <View style={styles.listContainer}>
            <SubSection title="Essential Cookies:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                Required for the Service to function properly
              </Text>
            </SubSection>

            <SubSection title="Analytics Cookies:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                Help us understand how users interact with our Service
              </Text>
            </SubSection>

            <SubSection title="Preference Cookies:">
              <Text style={[styles.textContent, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                Remember your settings and preferences
              </Text>
            </SubSection>
          </View>
        </Section>

        {/* Children's Privacy */}
        <Section title="Children's Privacy">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
          </Text>
        </Section>

        {/* Data Retention */}
        <Section title="Data Retention">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We retain your personal information and video content for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal data within 30 days, unless we are required to retain it for legal purposes.
          </Text>
        </Section>

        {/* International Data Transfers */}
        <Section title="International Data Transfers">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using our Service, you consent to the transfer of your information to these countries.
          </Text>
        </Section>

        {/* Changes to This Privacy Policy */}
        <Section title="Changes to This Privacy Policy">
          <Text style={[styles.textContent, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.
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

