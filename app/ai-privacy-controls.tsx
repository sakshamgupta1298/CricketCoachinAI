import React, { useCallback, useEffect, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Switch, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { getAiConsentStatus, getAiConsentUpdatedAt, setAiConsentStatus } from '../src/services/aiConsent';
import { borderRadius, shadows, spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function AiPrivacyControlsScreen() {
  const theme = useTheme();
  const [isEnabled, setIsEnabled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  if (Platform.OS !== 'ios') {
    // This screen exists to support Apple App Review consent/withdrawal requirements.
    // iOS-only: hide on Android for UX simplicity.
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, margin: getResponsiveSize(spacing.lg) }]}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            AI Data Sharing (iOS only)
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
            This consent/withdrawal control is available on iOS.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const loadConsent = useCallback(async () => {
    const status = await getAiConsentStatus();
    const consentUpdatedAt = await getAiConsentUpdatedAt();
    setIsEnabled(status === 'granted');
    setUpdatedAt(consentUpdatedAt);
  }, []);

  useEffect(() => {
    loadConsent();
  }, [loadConsent]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConsent();
    setRefreshing(false);
  };

  const handleToggle = async (value: boolean) => {
    await setAiConsentStatus(value ? 'granted' : 'withdrawn');
    setIsEnabled(value);
    setUpdatedAt(new Date().toISOString());

    Toast.show({
      type: 'success',
      text1: value ? 'AI data sharing enabled' : 'AI data sharing disabled',
      text2: value
        ? 'AI features can share processed movement data with our AI processing partner (Google Gemini, Google LLC).'
        : 'Future AI requests to our AI processing partner (Google Gemini, Google LLC) are blocked until re-enabled.',
    });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(18) }]}>
          AI Data Sharing Consent
        </Text>
        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
          Allow CrickCoach AI to send processed movement/keypoint data and selected coaching context to our AI processing partner
          (Google Gemini, Google LLC) for AI analysis features. Raw video files are not sent to our AI processing partner (Google Gemini, Google LLC).
        </Text>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(15) }]}>
            Allow AI data sharing
          </Text>
          <Switch value={isEnabled} onValueChange={handleToggle} />
        </View>

        <Text style={[styles.status, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
          Current status: {isEnabled ? 'Allowed' : 'Withdrawn'}
        </Text>
        {!!updatedAt && (
          <Text style={[styles.status, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
            Last updated: {new Date(updatedAt).toLocaleString()}
          </Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
          What this affects
        </Text>
        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
          If disabled, AI-powered features (such as video analysis and training plan generation) that require third-party
          AI processing may be unavailable until you enable consent again.
        </Text>
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
  card: {
    borderRadius: borderRadius.md,
    padding: getResponsiveSize(spacing.md),
    marginBottom: getResponsiveSize(spacing.lg),
    ...shadows.sm,
  },
  title: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  body: {
    lineHeight: getResponsiveSize(22),
  },
  toggleRow: {
    marginTop: getResponsiveSize(spacing.md),
    marginBottom: getResponsiveSize(spacing.sm),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontWeight: '600',
    flex: 1,
    marginRight: getResponsiveSize(spacing.md),
  },
  status: {
    marginTop: getResponsiveSize(spacing.xs),
  },
});
