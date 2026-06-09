import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import LiveBallSpeed from '../src/ballspeed/LiveBallSpeed';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

export default function LiveBallSpeedScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) },
              ]}
            >
              Live Ball Speed (beta)
            </Text>
            <Text
              style={[
                styles.headerSub,
                { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) },
              ]}
            >
              Film a side-on delivery on-device. Enter distance, tap Measure, then Stop — no upload.
            </Text>
          </PremiumCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <LiveBallSpeed />
          </PremiumCard>

          <TouchableOpacity style={styles.backButtonRow} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={[styles.backLink, { color: theme.colors.primary }]}>Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: getResponsiveSize(spacing.lg),
    paddingBottom: getResponsiveSize(spacing.xl),
  },
  card: {
    marginBottom: getResponsiveSize(spacing.md),
  },
  headerTitle: {
    fontWeight: '800',
  },
  headerSub: {
    marginTop: getResponsiveSize(spacing.xs),
    fontWeight: '500',
    lineHeight: getResponsiveFontSize(18),
  },
  backButtonRow: {
    marginTop: getResponsiveSize(spacing.sm),
    alignItems: 'center',
    paddingVertical: getResponsiveSize(spacing.md),
  },
  backLink: {
    fontWeight: '700',
    fontSize: getResponsiveFontSize(15),
  },
});
