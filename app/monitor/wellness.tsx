import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { ScoreSelector } from '../../src/components/ui/ScoreSelector';
import { TrendChart, TrendPoint } from '../../src/components/ui/TrendChart';
import apiService from '../../src/services/api';
import { colors, spacing } from '../../src/theme';
import { WellnessEntry } from '../../src/types';
import { wellnessScore } from '../../src/utils/workload';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function WellnessScreen() {
  const theme = useTheme();
  const [sleepQuality, setSleepQuality] = useState(3);
  const [sleepHours, setSleepHours] = useState('8');
  const [soreness, setSoreness] = useState(3);
  const [fatigue, setFatigue] = useState(3);
  const [stress, setStress] = useState(3);
  const [mood, setMood] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<WellnessEntry[]>([]);

  const load = async () => {
    const res = await apiService.getWellness(14);
    if (res.success && res.data) {
      setHistory(res.data);
      // Pre-fill from today's existing entry if present (edit instead of dup).
      const today = res.data.find((e) => e.date.slice(0, 10) === todayISO());
      if (today) {
        setSleepQuality(today.sleep_quality);
        setSleepHours(String(today.sleep_hours));
        setSoreness(today.soreness);
        setFatigue(today.fatigue);
        setStress(today.stress);
        setMood(today.mood);
        setNotes(today.notes ?? '');
      }
    }
  };

  useEffect(() => {
    load();
  }, []);

  const previewScore = wellnessScore({
    id: '', date: todayISO(),
    sleep_quality: sleepQuality, sleep_hours: Number(sleepHours) || 0,
    soreness, fatigue, stress, mood,
  });

  const handleSave = async () => {
    setSaving(true);
    const entry: Omit<WellnessEntry, 'id'> = {
      date: todayISO(),
      sleep_quality: sleepQuality,
      sleep_hours: Number(sleepHours) || 0,
      soreness,
      fatigue,
      stress,
      mood,
      score: previewScore,
      notes: notes.trim() || undefined,
    };
    const res = await apiService.logWellness(entry);
    setSaving(false);
    if (res.success) {
      Toast.show({ type: 'success', text1: 'Wellness saved', text2: `Today's score: ${previewScore}` });
      router.back();
    } else {
      Toast.show({ type: 'error', text1: 'Could not save', text2: res.error || 'Please try again' });
    }
  };

  const series: TrendPoint[] = (() => {
    const byDay = new Map<string, number>();
    history.forEach((e) => byDay.set(e.date.slice(0, 10), e.score ?? wellnessScore(e)));
    const pts: TrendPoint[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      pts.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: byDay.has(iso) ? byDay.get(iso)! : null });
    }
    return pts;
  })();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <PremiumCard variant="elevated" padding="large" style={styles.scoreCard}>
        <Text style={[styles.scoreValue, { color: colors.cricket.blue }]}>{previewScore}</Text>
        <Text style={[styles.scoreLabel, { color: theme.colors.onSurfaceVariant }]}>Today's wellness score (0–100)</Text>
      </PremiumCard>

      <PremiumCard variant="elevated" padding="large">
        <ScoreSelector label="Sleep quality" value={sleepQuality} onChange={setSleepQuality} lowLabel="Poor" highLabel="Great" color={colors.cricket.blue} />
        <View style={styles.hoursRow}>
          <Text style={[styles.hoursLabel, { color: theme.colors.onSurface }]}>Hours slept</Text>
          <TextInput
            mode="outlined"
            value={sleepHours}
            onChangeText={setSleepHours}
            keyboardType="numeric"
            dense
            style={styles.hoursInput}
          />
        </View>
        <ScoreSelector label="Muscle soreness" value={soreness} onChange={setSoreness} lowLabel="Very sore" highLabel="None" color={colors.cricket.blue} />
        <ScoreSelector label="Fatigue" value={fatigue} onChange={setFatigue} lowLabel="Exhausted" highLabel="Fresh" color={colors.cricket.blue} />
        <ScoreSelector label="Stress" value={stress} onChange={setStress} lowLabel="High" highLabel="Relaxed" color={colors.cricket.blue} />
        <ScoreSelector label="Mood" value={mood} onChange={setMood} lowLabel="Low" highLabel="Great" color={colors.cricket.blue} />
        <TextInput
          mode="outlined"
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          style={styles.notes}
        />
        <PremiumButton title={saving ? 'Saving…' : 'Save check-in'} onPress={handleSave} loading={saving} fullWidth size="large" />
      </PremiumCard>

      <PremiumCard variant="elevated" padding="large" style={styles.trendCard}>
        <Text style={[styles.trendTitle, { color: theme.colors.onSurface }]}>Last 14 days</Text>
        <TrendChart data={series} maxValue={100} color={colors.cricket.blue} />
      </PremiumCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  scoreCard: { alignItems: 'center' },
  scoreValue: { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  scoreLabel: { fontSize: 13, marginTop: 4 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  hoursLabel: { fontWeight: '600', fontSize: 15 },
  hoursInput: { width: 100 },
  notes: { marginBottom: spacing.lg },
  trendCard: {},
  trendTitle: { fontWeight: '700', fontSize: 15, marginBottom: spacing.md },
});
