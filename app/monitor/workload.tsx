import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { ScoreSelector } from '../../src/components/ui/ScoreSelector';
import { TrendChart, TrendPoint } from '../../src/components/ui/TrendChart';
import { borderRadius, colors, spacing } from '../../src/theme';
import apiService from '../../src/services/api';
import { SessionType, WorkloadEntry } from '../../src/types';
import { computeWorkloadSummary, workloadFlagInfo } from '../../src/utils/workload';

const todayISO = () => new Date().toISOString().slice(0, 10);

const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: 'batting', label: 'Batting' },
  { value: 'bowling', label: 'Bowling' },
  { value: 'fielding', label: 'Fielding' },
  { value: 'gym', label: 'Gym' },
  { value: 'match', label: 'Match' },
  { value: 'other', label: 'Other' },
];

export default function WorkloadScreen() {
  const theme = useTheme();
  const [type, setType] = useState<SessionType>('batting');
  const [duration, setDuration] = useState('60');
  const [rpe, setRpe] = useState(5);
  const [balls, setBalls] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<WorkloadEntry[]>([]);

  const load = useCallback(async () => {
    const list = await apiService.getWorkload(30);
    setSessions(list.success && list.data ? list.data : []);
  }, []);

  // Reload whenever the screen regains focus so newly logged sessions show up.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const previewLoad = (Number(duration) || 0) * rpe;
  const summary = computeWorkloadSummary(sessions);
  const flagInfo = workloadFlagInfo(summary.flag);
  const flagColor =
    flagInfo.tone === 'success' ? colors.success : flagInfo.tone === 'error' ? colors.error : colors.warning;

  const handleSave = async () => {
    if (!duration || Number(duration) <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a duration' });
      return;
    }
    setSaving(true);
    const entry: Omit<WorkloadEntry, 'id'> = {
      date: todayISO(),
      type,
      duration_min: Number(duration),
      rpe,
      balls_bowled: type === 'bowling' && balls ? Number(balls) : undefined,
      load: previewLoad,
      notes: notes.trim() || undefined,
    };
    const res = await apiService.logWorkload(entry);
    setSaving(false);
    if (res.success) {
      Toast.show({ type: 'success', text1: 'Session logged', text2: `Load: ${previewLoad}` });
      router.back();
    } else {
      Toast.show({ type: 'error', text1: 'Could not save', text2: res.error || 'Please try again' });
    }
  };

  const series: TrendPoint[] = (() => {
    const byDay = new Map<string, number>();
    sessions.forEach((e) => {
      const iso = e.date.slice(0, 10);
      byDay.set(iso, (byDay.get(iso) ?? 0) + (e.load ?? e.rpe * e.duration_min));
    });
    const pts: TrendPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      pts.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: byDay.has(iso) ? byDay.get(iso)! : null });
    }
    return pts;
  })();

  const recent = [...sessions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      {/* ACWR gauge */}
      <PremiumCard variant="elevated" padding="large" style={StyleSheet.flatten([styles.gauge, { borderTopWidth: 4, borderTopColor: flagColor }])}>
        <Text style={[styles.gaugeValue, { color: flagColor }]}>{summary.acwr ? summary.acwr.toFixed(2) : '—'}</Text>
        <Text style={[styles.gaugeLabel, { color: theme.colors.onSurfaceVariant }]}>Acute : Chronic Workload Ratio</Text>
        <Text style={[styles.gaugeFlag, { color: flagColor }]}>{summary.acwr ? flagInfo.label : 'Log a few sessions to see your ratio'}</Text>
        <Text style={[styles.gaugeHint, { color: theme.colors.onSurfaceVariant }]}>Sweet spot 0.8–1.3 · risk rises above 1.5</Text>
      </PremiumCard>

      <PremiumCard variant="elevated" padding="large">
        <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Session type</Text>
        <View style={styles.chips}>
          {SESSION_TYPES.map((t) => {
            const selected = t.value === type;
            return (
              <TouchableOpacity
                key={t.value}
                activeOpacity={0.8}
                onPress={() => setType(t.value)}
                style={[styles.chip, { backgroundColor: selected ? colors.cricket.green : theme.colors.surfaceVariant, borderColor: selected ? colors.cricket.green : theme.colors.outline }]}
              >
                <Text style={{ color: selected ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 13 }}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.hoursRow}>
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurface, marginBottom: 0 }]}>Duration (min)</Text>
          <TextInput mode="outlined" value={duration} onChangeText={setDuration} keyboardType="numeric" dense style={styles.smallInput} />
        </View>

        <ScoreSelector label="Session RPE (effort)" value={rpe} onChange={setRpe} min={1} max={10} lowLabel="Easy" highLabel="Max" color={colors.cricket.green} />

        {type === 'bowling' && (
          <View style={styles.hoursRow}>
            <Text style={[styles.fieldLabel, { color: theme.colors.onSurface, marginBottom: 0 }]}>Balls bowled</Text>
            <TextInput mode="outlined" value={balls} onChangeText={setBalls} keyboardType="numeric" dense style={styles.smallInput} />
          </View>
        )}

        <View style={styles.loadPreview}>
          <Text style={[styles.loadLabel, { color: theme.colors.onSurfaceVariant }]}>Session load (RPE × min)</Text>
          <Text style={[styles.loadValue, { color: theme.colors.onSurface }]}>{previewLoad}</Text>
        </View>

        <TextInput mode="outlined" label="Notes (optional)" value={notes} onChangeText={setNotes} multiline style={styles.notes} />
        <PremiumButton title={saving ? 'Saving…' : 'Log session'} onPress={handleSave} loading={saving} fullWidth size="large" />
      </PremiumCard>

      <PremiumCard variant="elevated" padding="large">
        <Text style={[styles.trendTitle, { color: theme.colors.onSurface }]}>Daily load — last 14 days</Text>
        <TrendChart data={series} color={colors.cricket.green} />
      </PremiumCard>

      {recent.length > 0 && (
        <PremiumCard variant="elevated" padding="large">
          <Text style={[styles.trendTitle, { color: theme.colors.onSurface }]}>Recent sessions</Text>
          {recent.map((s) => (
            <View key={s.id || `${s.date}-${s.type}`} style={styles.row}>
              <Text style={[styles.rowMain, { color: theme.colors.onSurface }]}>
                {s.date.slice(5)} · {s.type}
              </Text>
              <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]}>
                {s.duration_min}m · RPE {s.rpe} · load {s.load ?? s.rpe * s.duration_min}
                {s.balls_bowled ? ` · ${s.balls_bowled} balls` : ''}
              </Text>
            </View>
          ))}
        </PremiumCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  gauge: { alignItems: 'center' },
  gaugeValue: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  gaugeLabel: { fontSize: 12, marginTop: 2 },
  gaugeFlag: { fontSize: 14, fontWeight: '700', marginTop: spacing.sm },
  gaugeHint: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  fieldLabel: { fontWeight: '600', fontSize: 15, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: borderRadius.round, borderWidth: 1 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  smallInput: { width: 100 },
  loadPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  loadLabel: { fontSize: 14, fontWeight: '500' },
  loadValue: { fontSize: 22, fontWeight: '700' },
  notes: { marginBottom: spacing.lg },
  trendTitle: { fontWeight: '700', fontSize: 15, marginBottom: spacing.md },
  row: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  rowMain: { fontWeight: '600', fontSize: 14, textTransform: 'capitalize' },
  rowSub: { fontSize: 12, marginTop: 2 },
});
