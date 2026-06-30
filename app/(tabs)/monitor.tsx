import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Modal, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { TrendChart, TrendPoint } from '../../src/components/ui/TrendChart';
import apiService from '../../src/services/api';
import { colors, spacing } from '../../src/theme';
import { FitnessTest, InjuryRecord, StreakInfo, WellnessEntry, WorkloadEntry, WorkloadSummary } from '../../src/types';
import { getResponsiveFontSize, getResponsiveSize } from '../../src/utils/responsive';
import { computeWorkloadSummary, wellnessScore, workloadFlagInfo } from '../../src/utils/workload';

const todayISO = () => new Date().toISOString().slice(0, 10);

// Build a 14-day labelled series from dated entries using a value selector.
function buildSeries<T extends { date: string }>(
  entries: T[],
  select: (e: T) => number,
  days = 14
): TrendPoint[] {
  const byDay = new Map<string, number>();
  entries.forEach((e) => byDay.set(e.date.slice(0, 10), select(e)));
  const points: TrendPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    points.push({
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      value: byDay.has(iso) ? byDay.get(iso)! : null,
    });
  }
  return points;
}

export default function MonitorScreen() {
  const theme = useTheme();
  const [wellness, setWellness] = useState<WellnessEntry[]>([]);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);
  const [fitness, setFitness] = useState<FitnessTest[]>([]);
  const [injuries, setInjuries] = useState<InjuryRecord[]>([]);
  const [summary, setSummary] = useState<WorkloadSummary | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  // Plain-language explanation of what each part of the Athlete Monitor does.
  const infoItems = [
    { icon: '😴', title: 'Wellness', body: 'A quick daily check-in on sleep, soreness, mood, stress and energy. It gives you a simple 0–100 readiness score so you can see how recovered you feel.' },
    { icon: '🏋️', title: 'Workload', body: 'Log each training or match session (type, how long, and how hard it felt). The app adds up your training load so you can see if you are doing too much or too little.' },
    { icon: '📈', title: 'ACWR (workload ratio)', body: 'Compares this week\'s load to your recent average. Around 0.8–1.3 is the safe zone; much higher means injury risk is rising. You need a few weeks of sessions before it becomes accurate.' },
    { icon: '⚡', title: 'Fitness', body: 'Save fitness test results (like Yo-Yo, sprints, jumps or weight) and watch them improve over time.' },
    { icon: '🩹', title: 'Injury', body: 'Track any injuries, their status and rehab notes so nothing gets forgotten.' },
    { icon: '📋', title: 'Weekly Report', body: 'An AI coach reads your week of data and writes a simple summary with what went well and what to focus on next.' },
    { icon: '🏏', title: 'Shot Progress', body: 'A weekly AI report that compares every shot you analyzed this week — it finds flaws that keep recurring and shows your improvement percentage from one video to the next for the same shot.' },
    { icon: '🔥', title: 'Streak', body: 'Analyze at least one video every day to build a streak. Miss a day and it resets — a simple nudge to keep practising.' },
  ];

  const loadAll = useCallback(async () => {
    const [w, l, f, inj, s, st] = await Promise.all([
      apiService.getWellness(30),
      apiService.getWorkload(30),
      apiService.getFitnessTests(),
      apiService.getInjuries(),
      apiService.getWorkloadSummary(),
      apiService.getStreak(),
    ]);
    const workloadEntries = l.success && l.data ? l.data : [];
    setWellness(w.success && w.data ? w.data : []);
    setWorkload(workloadEntries);
    setFitness(f.success && f.data ? f.data : []);
    setInjuries(inj.success && inj.data ? inj.data : []);
    setStreak(st.success && st.data ? st.data : null);
    // Prefer the server summary; fall back to local computation if unavailable.
    setSummary(s.success && s.data ? s.data : computeWorkloadSummary(workloadEntries));
  }, []);

  // Reload whenever the tab regains focus so newly logged entries show up.
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const today = todayISO();
  const loggedWellnessToday = wellness.some((e) => e.date.slice(0, 10) === today);
  const latestWellness = wellness.length
    ? [...wellness].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;
  const latestScore = latestWellness
    ? (latestWellness.score ?? wellnessScore(latestWellness))
    : null;
  const activeInjuries = injuries.filter((i) => i.status !== 'fit');

  const flagInfo = summary ? workloadFlagInfo(summary.flag) : null;
  const flagColor =
    flagInfo?.tone === 'success'
      ? colors.success
      : flagInfo?.tone === 'error'
      ? colors.error
      : colors.warning;

  const wellnessSeries = buildSeries(wellness, (e) => e.score ?? wellnessScore(e));
  const loadSeries = buildSeries(workload, (e) => e.load ?? e.rpe * e.duration_min);

  const modules = [
    { title: 'Wellness', subtitle: 'Daily check-in', icon: '😴', color: colors.cricket.blue, route: '/monitor/wellness' },
    { title: 'Workload', subtitle: 'Log a session', icon: '🏋️', color: colors.cricket.green, route: '/monitor/workload' },
    { title: 'Fitness', subtitle: 'Test results', icon: '⚡', color: colors.cricket.orange, route: '/monitor/fitness' },
    { title: 'Injury', subtitle: 'Status & rehab', icon: '🩹', color: colors.cricket.red, route: '/monitor/injury' },
    { title: 'Weekly Report', subtitle: 'AI summary', icon: '📋', color: colors.cricket.blue, route: '/monitor/report' },
    { title: 'Shot Progress', subtitle: 'Weekly shot report', icon: '🏏', color: colors.cricket.orange, route: '/monitor/shot-report' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.headerContent}>
          <Text style={[styles.greeting, { fontSize: getResponsiveFontSize(27) }]}>Athlete Monitor</Text>
          <Text style={[styles.subtitle, { fontSize: getResponsiveFontSize(14) }]}>
            Track wellness, workload, fitness & injuries over time
          </Text>
          {streak ? (
            <View style={styles.streakChip}>
              <Text style={styles.streakChipText}>
                🔥 {streak.current_streak} day{streak.current_streak === 1 ? '' : 's'} streak
                {streak.active_today ? '' : ' — analyze today!'}
              </Text>
            </View>
          ) : null}
        </Animated.View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setInfoVisible(true)}
          style={styles.infoButton}
          accessibilityLabel="What is the Athlete Monitor?"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.infoButtonText}>i</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* Plain-language explainer */}
      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity activeOpacity={1} style={styles.modalOverlay} onPress={() => setInfoVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>What is this screen?</Text>
            <Text style={[styles.modalIntro, { color: theme.colors.onSurfaceVariant }]}>
              The Athlete Monitor helps you keep an eye on how your body is coping with training, in plain numbers.
            </Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {infoItems.map((item) => (
                <View key={item.title} style={styles.infoRow}>
                  <Text style={styles.infoIcon}>{item.icon}</Text>
                  <View style={styles.infoTextWrap}>
                    <Text style={[styles.infoTitle, { color: theme.colors.onSurface }]}>{item.title}</Text>
                    <Text style={[styles.infoBody, { color: theme.colors.onSurfaceVariant }]}>{item.body}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setInfoVisible(false)}
              style={[styles.modalClose, { backgroundColor: theme.colors.primary }]}
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Today's status */}
      <View style={styles.section}>
        <View style={styles.statusRow}>
          <PremiumCard variant="elevated" padding="medium" style={StyleSheet.flatten([styles.statusCard, { borderTopWidth: 3, borderTopColor: colors.cricket.blue }])}>
            <Text style={[styles.statusValue, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(22) }]}>
              {latestScore != null ? latestScore : '—'}
            </Text>
            <Text style={[styles.statusLabel, { color: theme.colors.onSurfaceVariant }]}>Wellness score</Text>
            <Text style={[styles.statusHint, { color: loggedWellnessToday ? colors.success : colors.warning }]}>
              {loggedWellnessToday ? '✓ Logged today' : 'Not logged today'}
            </Text>
          </PremiumCard>

          <PremiumCard variant="elevated" padding="medium" style={StyleSheet.flatten([styles.statusCard, { borderTopWidth: 3, borderTopColor: flagColor }])}>
            <Text style={[styles.statusValue, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(22) }]}>
              {summary && summary.acwr ? summary.acwr.toFixed(2) : '—'}
            </Text>
            <Text style={[styles.statusLabel, { color: theme.colors.onSurfaceVariant }]}>Workload ACWR</Text>
            <Text style={[styles.statusHint, { color: flagColor }]}>
              {flagInfo ? flagInfo.label : 'No sessions yet'}
            </Text>
          </PremiumCard>
        </View>
      </View>

      {/* Active injury banner */}
      {activeInjuries.length > 0 && (
        <View style={styles.sectionTight}>
          <Animated.View entering={FadeInDown.springify()}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/monitor/injury')}>
              <PremiumCard variant="elevated" padding="medium" style={StyleSheet.flatten([styles.banner, { backgroundColor: colors.accent.container }])}>
                <Text style={[styles.bannerTitle, { color: colors.error }]}>
                  🩹 {activeInjuries.length} active {activeInjuries.length === 1 ? 'injury' : 'injuries'}
                </Text>
                <Text style={[styles.bannerBody, { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
                  {activeInjuries.map((i) => `${i.body_part} (${i.status})`).join(', ')}
                </Text>
              </PremiumCard>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Module shortcuts */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(18) }]}>
          Log & Track
        </Text>
        <View style={styles.grid}>
          {modules.map((m, i) => (
            <Animated.View key={m.title} entering={FadeInDown.delay(150 + i * 80).springify()} style={styles.gridItem}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(m.route as any)}>
                <PremiumCard variant="elevated" padding="medium" style={StyleSheet.flatten([styles.moduleCard, { borderLeftWidth: 4, borderLeftColor: m.color }])}>
                  <View style={[styles.moduleIcon, { backgroundColor: m.color + '20' }]}>
                    <Text style={{ fontSize: getResponsiveSize(22) }}>{m.icon}</Text>
                  </View>
                  <Text style={[styles.moduleTitle, { color: theme.colors.onSurface }]}>{m.title}</Text>
                  <Text style={[styles.moduleSubtitle, { color: theme.colors.onSurfaceVariant }]}>{m.subtitle}</Text>
                </PremiumCard>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>

      {/* Wellness trend */}
      <View style={styles.section}>
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <PremiumCard variant="elevated" padding="large">
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Wellness — last 14 days</Text>
            <TrendChart data={wellnessSeries} maxValue={100} unit="" color={colors.cricket.blue} />
          </PremiumCard>
        </Animated.View>
      </View>

      {/* Workload trend */}
      <View style={styles.section}>
        <Animated.View entering={FadeInUp.delay(250).springify()}>
          <PremiumCard variant="elevated" padding="large">
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Training load — last 14 days</Text>
            <TrendChart data={loadSeries} color={colors.cricket.green} />
            {summary && (
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{summary.acute_load}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Acute (7d)</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{summary.chronic_load}</Text>
                  <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Chronic (wk avg)</Text>
                </View>
                {summary.weekly_balls != null && (
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>{summary.weekly_balls}</Text>
                    <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>Balls (7d)</Text>
                  </View>
                )}
              </View>
            )}
          </PremiumCard>
        </Animated.View>
      </View>

      {/* Latest fitness */}
      {fitness.length > 0 && (
        <View style={styles.section}>
          <Animated.View entering={FadeInUp.delay(300).springify()}>
            <PremiumCard variant="elevated" padding="large">
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Latest fitness tests</Text>
              {Object.values(
                fitness.reduce((acc: Record<string, FitnessTest>, t) => {
                  const prev = acc[t.metric];
                  if (!prev || t.date > prev.date) acc[t.metric] = t;
                  return acc;
                }, {})
              ).map((t) => (
                <View key={t.metric} style={styles.fitnessRow}>
                  <Text style={[styles.fitnessMetric, { color: theme.colors.onSurface }]}>{t.metric}</Text>
                  <Text style={[styles.fitnessValue, { color: theme.colors.onSurfaceVariant }]}>
                    {t.value} {t.unit}
                  </Text>
                </View>
              ))}
            </PremiumCard>
          </Animated.View>
        </View>
      )}

      <View style={{ height: getResponsiveSize(spacing.xl) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: getResponsiveSize(spacing.xxl + 20),
    paddingBottom: getResponsiveSize(spacing.xl),
    paddingHorizontal: getResponsiveSize(spacing.lg),
  },
  headerContent: { paddingBottom: getResponsiveSize(spacing.md) },
  greeting: { fontWeight: '700', marginBottom: getResponsiveSize(spacing.xs), color: 'white', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  streakChip: {
    alignSelf: 'flex-start',
    marginTop: getResponsiveSize(spacing.sm),
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: getResponsiveSize(spacing.md),
    paddingVertical: getResponsiveSize(spacing.xs),
  },
  streakChipText: { color: 'white', fontWeight: '700', fontSize: 13 },
  section: { paddingHorizontal: getResponsiveSize(spacing.lg), paddingTop: getResponsiveSize(spacing.lg) },
  sectionTight: { paddingHorizontal: getResponsiveSize(spacing.lg), paddingTop: getResponsiveSize(spacing.md) },
  sectionTitle: { fontWeight: '700', marginBottom: getResponsiveSize(spacing.md), letterSpacing: -0.3 },
  statusRow: { flexDirection: 'row', gap: getResponsiveSize(spacing.md) },
  statusCard: { flex: 1, alignItems: 'center' },
  statusValue: { fontWeight: '700', letterSpacing: -0.3 },
  statusLabel: { fontSize: 11, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  statusHint: { fontSize: 11, fontWeight: '600', marginTop: getResponsiveSize(spacing.xs), textAlign: 'center' },
  banner: { borderRadius: 16 },
  bannerTitle: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  bannerBody: { fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: getResponsiveSize(spacing.md) },
  gridItem: { width: '47%' },
  moduleCard: { minHeight: getResponsiveSize(120) },
  moduleIcon: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(24),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  moduleTitle: { fontWeight: '600', fontSize: 15 },
  moduleSubtitle: { fontSize: 12, marginTop: 2 },
  cardTitle: { fontWeight: '700', fontSize: 15, marginBottom: getResponsiveSize(spacing.md) },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: getResponsiveSize(spacing.md) },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontWeight: '700', fontSize: 18 },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  fitnessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: getResponsiveSize(spacing.sm),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  fitnessMetric: { fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  fitnessValue: { fontSize: 14, fontWeight: '500' },
  infoButton: {
    position: 'absolute',
    top: getResponsiveSize(spacing.xxl + 20),
    right: getResponsiveSize(spacing.lg),
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  infoButtonText: { color: 'white', fontSize: 16, fontWeight: '700', fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { borderRadius: 20, padding: spacing.lg, maxHeight: '80%' },
  modalTitle: { fontWeight: '700', fontSize: 20, marginBottom: spacing.xs },
  modalIntro: { fontSize: 14, lineHeight: 20, marginBottom: spacing.md },
  modalScroll: { flexGrow: 0 },
  infoRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  infoIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  infoTextWrap: { flex: 1 },
  infoTitle: { fontWeight: '700', fontSize: 15, marginBottom: 2 },
  infoBody: { fontSize: 13, lineHeight: 19 },
  modalClose: { marginTop: spacing.sm, borderRadius: 12, paddingVertical: spacing.md, alignItems: 'center' },
  modalCloseText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
