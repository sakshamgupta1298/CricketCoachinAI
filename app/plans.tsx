import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { useAuth } from '../src/context/AuthContext';
import { useEntitlements } from '../src/context/EntitlementsContext';
import apiService from '../src/services/api';
import { borderRadius, spacing } from '../src/theme';
import { Plan } from '../src/types';

// Feature rows rendered on every plan card. `value` derives the cell content
// from the plan so the matrix always matches the backend definition.
type Row = { label: string; value: (p: Plan) => string | boolean };

const FEATURE_ROWS: Row[] = [
  { label: 'Video analyses', value: (p) => p.tier === 'free' ? '5 total' : `${p.monthly_credits} / month` },
  { label: 'Batting / bowling / keeper analysis', value: () => true },
  { label: 'Biomechanical flaws + injury risk', value: () => true },
  { label: '7-day AI plan + YouTube drills', value: () => true },
  { label: 'Hindi translation + TTS', value: (p) => !!p.features.feature_hindi },
  { label: 'Analysis history', value: (p) => p.features.feature_full_history ? 'Full' : 'Last 5' },
  { label: 'Athlete monitoring (wellness, ACWR, fitness, injury)', value: (p) => p.tier === 'free' ? 'View only' : !!p.features.feature_monitoring },
  { label: 'Weekly AI monitoring report', value: (p) => !!p.features.feature_monitoring },
  { label: 'Video comparison (progress)', value: (p) => !!p.features.feature_compare },
  { label: 'Ball speed + bat-ball contact', value: (p) => !!p.features.feature_ball_speed },
  { label: 'Priority processing queue', value: (p) => !!p.features.feature_priority },
];

const TIER_ORDER: Record<string, number> = { free: 0, pro_350: 1, pro_450: 2 };

export default function PlansScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { entitlements, refresh } = useEntitlements();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    const res = await apiService.getPlans();
    if (res.success && res.data) {
      const sorted = [...res.data].sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9));
      setPlans(sorted);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPlans();
    void refresh();
  }, [loadPlans, refresh]);

  const currentTier = entitlements?.plan_tier ?? 'free';

  const handleSubscribe = useCallback(async (plan: Plan) => {
    if (!plan.recurring) return;

    // react-native-razorpay is a native module: it's unavailable in Expo Go and
    // only works in a development/production build. Load it lazily so this screen
    // still renders in Expo Go, and fail gracefully if the module is missing.
    let RazorpayCheckout: any = null;
    try {
      RazorpayCheckout = require('react-native-razorpay').default;
    } catch {
      RazorpayCheckout = null;
    }
    if (!RazorpayCheckout || typeof RazorpayCheckout.open !== 'function') {
      Alert.alert(
        'Payments need a full build',
        'Razorpay checkout is a native module that does not run in Expo Go. Build a development or production app to subscribe.'
      );
      return;
    }

    setPurchasing(plan.plan_id);
    try {
      const created = await apiService.createSubscription(plan.plan_id);
      if (!created.success || !created.data) {
        Alert.alert('Could not start checkout', created.error || 'Please try again later.');
        return;
      }

      const { subscription_id, key_id, name } = created.data;

      const options = {
        key: key_id,
        subscription_id,
        name: 'CricketCoachAI',
        description: `${name} — ₹${plan.price_inr}/month`,
        prefill: {
          email: (user as any)?.email || '',
          name: (user as any)?.username || (user as any)?.name || '',
        },
        theme: { color: theme.colors.primary },
      };

      const payment = await RazorpayCheckout.open(options as any);

      const verify = await apiService.verifySubscription({
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_subscription_id: payment.razorpay_subscription_id || subscription_id,
        razorpay_signature: payment.razorpay_signature,
      });

      if (verify.success) {
        await refresh();
        Toast.show({ type: 'success', text1: 'Subscription active', text2: `You're now on ${name}.` });
        router.back();
      } else {
        Alert.alert('Payment not verified', verify.error || 'If you were charged, it will be reconciled automatically.');
      }
    } catch (err: any) {
      // Razorpay throws an object with a code/description when the user cancels.
      const desc = err?.description || err?.error?.description;
      if (desc && !/cancel/i.test(String(desc))) {
        Alert.alert('Payment failed', String(desc));
      }
    } finally {
      setPurchasing(null);
    }
  }, [user, theme.colors.primary, refresh]);

  const renderCell = (val: string | boolean) => {
    if (val === true) return <Text style={[styles.cellIcon, { color: theme.colors.secondary }]}>✓</Text>;
    if (val === false) return <Text style={[styles.cellIcon, { color: theme.colors.error }]}>✕</Text>;
    return <Text style={[styles.cellText, { color: theme.colors.onSurfaceVariant }]}>{val}</Text>;
  };

  const styles = useMemo(() => makeStyles(theme), [theme]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text variant="headlineSmall" style={styles.title}>Choose your plan</Text>
        <Text style={styles.subtitle}>
          You're on the {labelForTier(currentTier)} plan · {entitlements?.analysis_credits_remaining ?? 0} analyses left
        </Text>

        {plans.map((plan, idx) => {
          const isCurrent = plan.tier === currentTier;
          const isPaid = plan.recurring;
          const highlight = plan.tier === 'pro_450';
          return (
            <Animated.View key={plan.plan_id} entering={FadeInDown.delay(idx * 80)}>
              <PremiumCard style={[styles.card, highlight && { borderColor: theme.colors.primary, borderWidth: 2 }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="titleMedium" style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.price}>
                      {isPaid ? `₹${plan.price_inr}` : 'Free'}
                      {isPaid && <Text style={styles.perMonth}> / month</Text>}
                    </Text>
                  </View>
                  {highlight && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.badgeText}>BEST VALUE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.rows}>
                  {FEATURE_ROWS.map((row) => (
                    <View key={row.label} style={styles.row}>
                      <Text style={[styles.rowLabel, { color: theme.colors.onSurface }]}>{row.label}</Text>
                      <View style={styles.rowValue}>{renderCell(row.value(plan))}</View>
                    </View>
                  ))}
                </View>

                {isCurrent ? (
                  <View style={[styles.cta, styles.ctaCurrent, { borderColor: theme.colors.outline }]}>
                    <Text style={[styles.ctaCurrentText, { color: theme.colors.onSurfaceVariant }]}>Current plan</Text>
                  </View>
                ) : isPaid ? (
                  <TouchableOpacity
                    style={[styles.cta, { backgroundColor: theme.colors.primary }]}
                    disabled={!!purchasing}
                    onPress={() => handleSubscribe(plan)}
                  >
                    {purchasing === plan.plan_id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.ctaText}>Subscribe · ₹{plan.price_inr}/mo</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.cta, styles.ctaCurrent, { borderColor: theme.colors.outline }]}>
                    <Text style={[styles.ctaCurrentText, { color: theme.colors.onSurfaceVariant }]}>Included free</Text>
                  </View>
                )}
              </PremiumCard>
            </Animated.View>
          );
        })}

        <Text style={styles.fineprint}>
          Subscriptions auto-renew monthly via Razorpay. Your monthly analyses reset on each renewal.
          You can cancel anytime from your Razorpay account; access continues until the period ends.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function labelForTier(tier: string): string {
  switch (tier) {
    case 'pro_350': return 'New Professional';
    case 'pro_450': return 'Serious Professional';
    default: return 'Free Trial';
  }
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { fontWeight: '800', color: theme.colors.onBackground, marginBottom: spacing.xs },
  subtitle: { color: theme.colors.onSurfaceVariant, marginBottom: spacing.lg },
  card: { padding: spacing.lg, marginBottom: spacing.lg, borderRadius: borderRadius.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  planName: { fontWeight: '700', color: theme.colors.onSurface },
  price: { fontSize: 26, fontWeight: '800', color: theme.colors.primary, marginTop: 2 },
  perMonth: { fontSize: 14, fontWeight: '500', color: theme.colors.onSurfaceVariant },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.round },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  rows: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.outlineVariant },
  rowLabel: { flex: 1, fontSize: 13, paddingRight: spacing.sm },
  rowValue: { minWidth: 64, alignItems: 'flex-end' },
  cellIcon: { fontSize: 16, fontWeight: '800' },
  cellText: { fontSize: 12, fontWeight: '600' },
  cta: { borderRadius: borderRadius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ctaCurrent: { borderWidth: 1, backgroundColor: 'transparent' },
  ctaCurrentText: { fontWeight: '600' },
  fineprint: { fontSize: 11, color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 16, marginTop: spacing.sm },
});
