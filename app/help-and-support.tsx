import React from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function HelpAndSupportScreen() {
  const theme = useTheme();

  const handleEmailPress = () => {
    Linking.openURL('mailto:admin@crickcoachai.com');
  };

  const handleWebsitePress = () => {
    Linking.openURL('https://www.crickcoachai.com');
  };

  const ContactItem = ({ label, value, onPress, icon }: { label: string; value: string; onPress: () => void; icon: string }) => (
    <TouchableOpacity
      style={[styles.contactItem, { backgroundColor: theme.colors.surface }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contactItemLeft}>
        <Text style={[styles.contactIcon, { fontSize: getResponsiveSize(24) }]}>{icon}</Text>
        <View style={styles.contactInfo}>
          <Text style={[styles.contactLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
            {label}
          </Text>
          <Text style={[styles.contactValue, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
            {value}
          </Text>
        </View>
      </View>
      <Text style={[styles.contactArrow, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(20) }]}>›</Text>
    </TouchableOpacity>
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
            Help & Support
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
            Get in touch with us for assistance, questions, or feedback
          </Text>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(18) }]}>
            Contact Information
          </Text>
          <View style={styles.contactContainer}>
            <ContactItem
              label="Email ID"
              value="admin@crickcoachai.com"
              onPress={handleEmailPress}
              icon="✉️"
            />
            <ContactItem
              label="Website"
              value="www.crickcoachai.com"
              onPress={handleWebsitePress}
              icon="🌐"
            />
          </View>
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Text style={[styles.helpText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
            If you have any questions, need technical support, or want to provide feedback, please don't hesitate to reach out to us. We're here to help!
          </Text>
        </View>
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
  subtitle: {
    marginTop: getResponsiveSize(spacing.xs),
    lineHeight: getResponsiveSize(20),
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
  contactContainer: {
    gap: getResponsiveSize(spacing.md),
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsiveSize(spacing.md),
    borderRadius: 12,
    marginBottom: getResponsiveSize(spacing.sm),
  },
  contactItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    marginRight: getResponsiveSize(spacing.md),
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  contactValue: {
    fontWeight: '500',
    // fontSize set dynamically
  },
  contactArrow: {
    fontWeight: '300',
    // fontSize set dynamically
  },
  helpSection: {
    marginTop: getResponsiveSize(spacing.lg),
    padding: getResponsiveSize(spacing.md),
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  helpText: {
    lineHeight: getResponsiveSize(22),
    textAlign: 'center',
    // fontSize set dynamically
  },
});

