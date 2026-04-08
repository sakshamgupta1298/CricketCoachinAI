import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { useEntitlements } from '../src/context/EntitlementsContext';
import apiService from '../src/services/api';
import { currentConfig } from '../config';
import type { PlanDefinition, PlanId } from '../src/types';

let RazorpayCheckout: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  RazorpayCheckout = require('react-native-razorpay').default;
} catch {
  RazorpayCheckout = null;
}

export default function PlansScreen() {
  const theme = useTheme();
  const { entitlements, refresh } = useEntitlements();
  const [busyPlanId, setBusyPlanId] = useState<PlanId | null>(null);

  const plans = useMemo<PlanDefinition[]>(
    () => [
      {
        id: 'plan1',
        title: 'Plan 1',
        price_inr: 199,
        analysis_credits: 40,
        enables_compare: false,
        enables_ball_speed: false,
      },
      {
        id: 'plan2',
        title: 'Plan 2',
        price_inr: 299,
        analysis_credits: 100,
        enables_compare: true,
        enables_ball_speed: false,
      },
      {
        id: 'plan3',
        title: 'Plan 3',
        price_inr: 399,
        analysis_credits: 210,
        enables_compare: true,
        enables_ball_speed: true,
      },
    ],
    []
  );

  const startCheckout = async (planId: PlanId) => {
    if (!RazorpayCheckout) {
      Alert.alert(
        'Razorpay not available',
        'This build does not include Razorpay native module. Please run a dev-client / production build.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setBusyPlanId(planId);

      const orderResp = await apiService.createRazorpayOrder(planId);
      if (!orderResp.success || !orderResp.data) {
        throw new Error(orderResp.error || 'Failed to create order');
      }

      const order = orderResp.data;
      const options = {
        key: order.key_id || (currentConfig as any)?.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'CrickCoach AI',
        description: `Purchase ${planId.toUpperCase()}`,
        order_id: order.order_id,
        prefill: {},
        theme: { color: theme.colors.primary },
      };

      const payment = await RazorpayCheckout.open(options);

      const verifyResp = await apiService.verifyRazorpayPayment({
        plan_id: planId,
        razorpay_order_id: payment.razorpay_order_id,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_signature: payment.razorpay_signature,
      });

      if (!verifyResp.success) {
        throw new Error(verifyResp.error || 'Payment verification failed');
      }

      await refresh();
      Toast.show({ type: 'success', text1: 'Payment successful', text2: 'Your plan has been activated.' });
    } catch (e: any) {
      const msg = e?.message || 'Payment failed. Please try again.';
      Alert.alert('Payment failed', msg, [{ text: 'OK' }]);
    } finally {
      setBusyPlanId(null);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      <PremiumCard variant="elevated" padding="large" style={styles.headerCard}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Plans</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Free: 20 analyses. Then buy analysis packs.
        </Text>
        <View style={styles.entRow}>
          <Text style={[styles.entLabel, { color: theme.colors.onSurfaceVariant }]}>Remaining analyses</Text>
          <Text style={[styles.entValue, { color: theme.colors.onSurface }]}>
            {entitlements.analysis_credits_remaining}
          </Text>
        </View>
        <View style={styles.entRow}>
          <Text style={[styles.entLabel, { color: theme.colors.onSurfaceVariant }]}>Compare</Text>
          <Text style={[styles.entValue, { color: theme.colors.onSurface }]}>
            {entitlements.feature_compare ? 'Enabled' : 'Locked'}
          </Text>
        </View>
        <View style={styles.entRow}>
          <Text style={[styles.entLabel, { color: theme.colors.onSurfaceVariant }]}>Ball Speed</Text>
          <Text style={[styles.entValue, { color: theme.colors.onSurface }]}>
            {entitlements.feature_ball_speed ? 'Enabled' : 'Locked'}
          </Text>
        </View>
      </PremiumCard>

      {plans.map((p) => {
        const loading = busyPlanId === p.id;
        return (
          <PremiumCard key={p.id} variant="elevated" padding="large" style={styles.planCard}>
            <Text style={[styles.planTitle, { color: theme.colors.onSurface }]}>{p.title}</Text>
            <Text style={[styles.planPrice, { color: theme.colors.primary }]}>₹{p.price_inr}</Text>
            <Text style={[styles.planLine, { color: theme.colors.onSurfaceVariant }]}>
              +{p.analysis_credits} analyses
            </Text>
            <Text style={[styles.planLine, { color: theme.colors.onSurfaceVariant }]}>
              Compare: {p.enables_compare ? 'Enabled' : 'No'}
            </Text>
            <Text style={[styles.planLine, { color: theme.colors.onSurfaceVariant }]}>
              Ball Speed: {p.enables_ball_speed ? 'Enabled' : 'No'}
            </Text>

            <View style={{ marginTop: 12 }}>
              <PremiumButton
                title={loading ? 'Processing...' : `Buy ${p.title}`}
                onPress={() => startCheckout(p.id)}
                variant="primary"
                size="large"
                fullWidth
                disabled={busyPlanId !== null}
              />
              {loading && (
                <View style={{ marginTop: 10 }}>
                  <ActivityIndicator />
                </View>
              )}
            </View>
          </PremiumCard>
        );
      })}

      <TouchableOpacity onPress={() => router.back()} style={styles.backRow} activeOpacity={0.8}>
        <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 24,
  },
  headerCard: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  entRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  entValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  planCard: {
    marginBottom: 14,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  planPrice: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '900',
  },
  planLine: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  backRow: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});

