import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { TrendChart, TrendPoint } from '../../src/components/ui/TrendChart';
import { borderRadius, colors, spacing } from '../../src/theme';
import apiService from '../../src/services/api';
import { FitnessTest } from '../../src/types';

const todayISO = () => new Date().toISOString().slice(0, 10);

// Common cricket fitness tests with their default units. "Other" lets the user
// type a custom metric. Higher-is-better is metric-dependent and only affects
// interpretation, not storage.
const METRICS: { key: string; label: string; unit: string }[] = [
  { key: 'yoyo', label: 'Yo-Yo', unit: 'level' },
  { key: '2km_run', label: '2km Run', unit: 's' },
  { key: 'sprint_20m', label: '20m Sprint', unit: 's' },
  { key: 'vertical_jump', label: 'Vertical Jump', unit: 'cm' },
  { key: 'bench_press', label: 'Bench Press', unit: 'kg' },
  { key: 'squat', label: 'Squat', unit: 'kg' },
  { key: 'weight', label: 'Body Weight', unit: 'kg' },
];

export default function FitnessScreen() {
  const theme = useTheme();
  const [metric, setMetric] = useState(METRICS[0].key);
  const [unit, setUnit] = useState(METRICS[0].unit);
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [tests, setTests] = useState<FitnessTest[]>([]);

  const load = async () => {
    const res = await apiService.getFitnessTests();
    if (res.success && res.data) setTests(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const selectMetric = (key: string, defaultUnit: string) => {
    setMetric(key);
    setUnit(defaultUnit);
  };

  const handleSave = async () => {
    if (!value || Number.isNaN(Number(value))) {
      Toast.show({ type: 'error', text1: 'Enter a value' });
      return;
    }
    setSaving(true);
    const entry: Omit<FitnessTest, 'id'> = {
      date: todayISO(),
      metric,
      value: Number(value),
      unit,
      notes: notes.trim() || undefined,
    };
    const res = await apiService.logFitnessTest(entry);
    setSaving(false);
    if (res.success) {
      Toast.show({ type: 'success', text1: 'Result saved' });
      router.back();
    } else {
      Toast.show({ type: 'error', text1: 'Could not save', text2: res.error || 'Please try again' });
    }
  };

  // History chart for the currently selected metric.
  const metricHistory = tests
    .filter((t) => t.metric === metric)
    .sort((a, b) => a.date.localeCompare(b.date));
  const series: TrendPoint[] = metricHistory.map((t) => ({ label: t.date.slice(5), value: t.value }));

  // Latest value per metric for the summary list.
  const latestPerMetric = Object.values(
    tests.reduce((acc: Record<string, FitnessTest>, t) => {
      const prev = acc[t.metric];
      if (!prev || t.date > prev.date) acc[t.metric] = t;
      return acc;
    }, {})
  ).sort((a, b) => a.metric.localeCompare(b.metric));

  const metricLabel = (key: string) => METRICS.find((m) => m.key === key)?.label ?? key;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <PremiumCard variant="elevated" padding="large">
        <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Test</Text>
        <View style={styles.chips}>
          {METRICS.map((m) => {
            const selected = m.key === metric;
            return (
              <TouchableOpacity
                key={m.key}
                activeOpacity={0.8}
                onPress={() => selectMetric(m.key, m.unit)}
                style={[styles.chip, { backgroundColor: selected ? colors.cricket.orange : theme.colors.surfaceVariant, borderColor: selected ? colors.cricket.orange : theme.colors.outline }]}
              >
                <Text style={{ color: selected ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 13 }}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.valueRow}>
          <TextInput mode="outlined" label="Value" value={value} onChangeText={setValue} keyboardType="numeric" style={styles.valueInput} />
          <TextInput mode="outlined" label="Unit" value={unit} onChangeText={setUnit} style={styles.unitInput} />
        </View>

        <TextInput mode="outlined" label="Notes (optional)" value={notes} onChangeText={setNotes} multiline style={styles.notes} />
        <PremiumButton title={saving ? 'Saving…' : 'Save result'} onPress={handleSave} loading={saving} fullWidth size="large" />
      </PremiumCard>

      <PremiumCard variant="elevated" padding="large">
        <Text style={[styles.trendTitle, { color: theme.colors.onSurface }]}>{metricLabel(metric)} over time</Text>
        {series.length > 0 ? (
          <TrendChart data={series} variant="line" color={colors.cricket.orange} />
        ) : (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>No results yet for this test.</Text>
        )}
      </PremiumCard>

      {latestPerMetric.length > 0 && (
        <PremiumCard variant="elevated" padding="large">
          <Text style={[styles.trendTitle, { color: theme.colors.onSurface }]}>Latest results</Text>
          {latestPerMetric.map((t) => (
            <View key={t.metric} style={styles.row}>
              <Text style={[styles.rowMain, { color: theme.colors.onSurface }]}>{metricLabel(t.metric)}</Text>
              <Text style={[styles.rowSub, { color: theme.colors.onSurfaceVariant }]}>
                {t.value} {t.unit} · {t.date.slice(5)}
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
  fieldLabel: { fontWeight: '600', fontSize: 15, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: borderRadius.round, borderWidth: 1 },
  valueRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  valueInput: { flex: 2 },
  unitInput: { flex: 1 },
  notes: { marginBottom: spacing.lg },
  trendTitle: { fontWeight: '700', fontSize: 15, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)' },
  rowMain: { fontWeight: '600', fontSize: 14 },
  rowSub: { fontSize: 13 },
});
