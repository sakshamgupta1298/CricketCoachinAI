import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { spacing } from '../theme';

type PlanKey = 'basic_monthly' | 'pro_monthly' | 'elite_monthly' | 'elite_yearly';

const PLANS: Array<{
  key: PlanKey;
  title: string;
  price: string;
  badge?: string;
  bullets: string[];
}> = [
  {
    key: 'basic_monthly',
    title: 'Basic',
    price: '₹199 / month',
    bullets: ['50 analyses', 'Beginner-friendly'],
  },
  {
    key: 'pro_monthly',
    title: 'Pro',
    badge: 'Most Popular',
    price: '₹399 / month',
    bullets: ['300 analyses', 'Video comparison', '1:1 Coach Session (1 / month)', 'Ideal for improving players'],
  },
  {
    key: 'elite_monthly',
    title: 'Elite',
    price: '₹999 / month',
    bullets: [
      '1000 analyses (fair usage)',
      'Video comparison',
      'Ball speed detection',
      'Advanced shot insights',
      'Performance tracking',
      '1:1 Coach Sessions (2 / month)',
    ],
  },
  {
    key: 'elite_yearly',
    title: 'Elite Yearly',
    badge: 'Flagship',
    price: '₹7999 / year',
    bullets: ['Everything in Elite', '1:1 Coach Sessions (24 / year)', '~30–35% savings', 'Priority booking access'],
  },
];

const PlansScreen: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const [loadingKey, setLoadingKey] = useState<PlanKey | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    const loadEntitlements = async () => {
      try {
        const resp = await apiService.getEntitlements();
        if (resp?.success) {
          setCurrentPlan(resp.entitlements?.plan_key || null);
        }
      } catch {
        // ignore
      }
    };
    loadEntitlements();
  }, []);

  const subscribe = async (planKey: PlanKey) => {
    try {
      setLoadingKey(planKey);
      const orderResp = await apiService.createRazorpayOrder(planKey);
      if (!orderResp?.order_id || !orderResp?.key_id || !orderResp?.amount) {
        Alert.alert('Payment Error', orderResp?.error || 'Failed to create order. Please try again.');
        return;
      }

      const options: any = {
        key: orderResp.key_id,
        amount: String(orderResp.amount),
        currency: orderResp.currency || 'INR',
        name: 'CrickCoach AI',
        description: 'Subscription plan purchase',
        order_id: orderResp.order_id,
        prefill: {
          email: user?.email || '',
          name: user?.name || '',
        },
        notes: {
          plan_id: orderResp.plan_id, // backend stores plan_key in plan_id for new plans
        },
        theme: { color: '#2E7D32' },
      };

      const result: any = await RazorpayCheckout.open(options);

      // Verify on backend
      const verifyResp = await apiService.verifyRazorpayPayment({
        plan_id: orderResp.plan_id,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });

      if (!verifyResp?.success) {
        Alert.alert('Verification Failed', verifyResp?.error || 'Payment verification failed.');
        return;
      }

      setCurrentPlan(verifyResp?.entitlements?.plan_key || planKey);
      Alert.alert('Success', 'Subscription activated successfully.');
    } catch (e: any) {
      const msg = e?.description || e?.message || 'Payment cancelled or failed.';
      Alert.alert('Payment', msg);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>Choose your plan</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
          Unlock more analyses, premium insights, and coaching.
        </Text>

        {PLANS.map((p) => (
          <Card key={p.key} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, { color: theme.colors.onSurface }]}>{p.title}</Text>
                  {!!p.badge && (
                    <Text style={[styles.badge, { color: theme.colors.primary }]}>{p.badge}</Text>
                  )}
                </View>
                <Text style={[styles.price, { color: theme.colors.onSurface }]}>{p.price}</Text>
              </View>

              {p.bullets.map((b, idx) => (
                <Text key={idx} style={[styles.bullet, { color: theme.colors.onSurfaceVariant }]}>
                  • {b}
                </Text>
              ))}

              <Button
                mode={currentPlan === p.key ? 'outlined' : 'contained'}
                style={styles.button}
                disabled={loadingKey !== null || currentPlan === p.key}
                loading={loadingKey === p.key}
                onPress={() => subscribe(p.key)}
              >
                {currentPlan === p.key ? 'Current Plan' : 'Subscribe'}
              </Button>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '700', marginBottom: spacing.xs },
  subtitle: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  planTitle: { fontSize: 18, fontWeight: '700' },
  badge: { marginTop: 2, fontSize: 12, fontWeight: '700' },
  price: { fontSize: 14, fontWeight: '700' },
  bullet: { marginTop: spacing.xs },
  button: { marginTop: spacing.md },
});

export default PlansScreen;

