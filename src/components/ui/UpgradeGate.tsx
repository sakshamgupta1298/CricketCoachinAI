import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntitlements } from '../../context/EntitlementsContext';
import { Entitlements } from '../../types';
import { borderRadius, spacing } from '../../theme';

/** Full-screen "locked" card with an Upgrade CTA. Use via UpgradeGate or as an
 *  early return in a screen that already has its own entitlement check. */
export const LockedFeatureScreen: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Text style={styles.lock}>🔒</Text>
        <Text variant="titleLarge" style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[styles.desc, { color: theme.colors.onSurfaceVariant }]}>{description}</Text>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/plans')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Upgrade to unlock</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

interface Props {
  /** Entitlement flag required to view the children. */
  feature: keyof Entitlements;
  title: string;
  description: string;
  children: React.ReactNode;
}

/**
 * Renders `children` when the user's plan includes `feature`; otherwise shows a
 * locked screen with an Upgrade call-to-action that routes to the paywall.
 */
export const UpgradeGate: React.FC<Props> = ({ feature, title, description, children }) => {
  const { hasFeature, loading } = useEntitlements();

  if (loading || hasFeature(feature)) {
    return <>{children}</>;
  }
  return <LockedFeatureScreen title={title} description={description} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 420, borderRadius: borderRadius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.xl, alignItems: 'center' },
  lock: { fontSize: 44, marginBottom: spacing.md },
  title: { fontWeight: '800', textAlign: 'center', marginBottom: spacing.sm },
  desc: { textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  cta: { borderRadius: borderRadius.md, paddingVertical: 14, paddingHorizontal: 28, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
