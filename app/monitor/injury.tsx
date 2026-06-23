import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { borderRadius, colors, spacing } from '../../src/theme';
import apiService from '../../src/services/api';
import { InjuryRecord, InjurySeverity, InjuryStatus } from '../../src/types';

const todayISO = () => new Date().toISOString().slice(0, 10);

const SEVERITIES: InjurySeverity[] = ['minor', 'moderate', 'severe'];
const STATUSES: { value: InjuryStatus; label: string }[] = [
  { value: 'fit', label: 'Fit' },
  { value: 'managing', label: 'Managing' },
  { value: 'rehab', label: 'Rehab' },
  { value: 'out', label: 'Out' },
];

const statusColor = (s: InjuryStatus) =>
  s === 'fit' ? colors.success : s === 'managing' ? colors.warning : s === 'rehab' ? colors.cricket.orange : colors.error;

export default function InjuryScreen() {
  const theme = useTheme();
  const [injuries, setInjuries] = useState<InjuryRecord[]>([]);
  const [bodyPart, setBodyPart] = useState('');
  const [injuryType, setInjuryType] = useState('');
  const [severity, setSeverity] = useState<InjurySeverity>('minor');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [rehabNotes, setRehabNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await apiService.getInjuries();
    if (res.success && res.data) setInjuries(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async () => {
    if (!bodyPart.trim()) {
      Toast.show({ type: 'error', text1: 'Enter the affected body part' });
      return;
    }
    setSaving(true);
    const record: Omit<InjuryRecord, 'id'> = {
      body_part: bodyPart.trim(),
      injury_type: injuryType.trim() || 'Unspecified',
      date_reported: todayISO(),
      severity,
      status: 'rehab',
      expected_return: expectedReturn.trim() || undefined,
      rehab_notes: rehabNotes.trim() || undefined,
    };
    const res = await apiService.logInjury(record);
    setSaving(false);
    if (res.success) {
      Toast.show({ type: 'success', text1: 'Injury logged' });
      setBodyPart('');
      setInjuryType('');
      setSeverity('minor');
      setExpectedReturn('');
      setRehabNotes('');
      load();
    } else {
      Toast.show({ type: 'error', text1: 'Could not save', text2: res.error || 'Please try again' });
    }
  };

  const changeStatus = async (record: InjuryRecord, status: InjuryStatus) => {
    // Optimistic update for snappy UI; revert on failure.
    const prev = injuries;
    setInjuries((list) => list.map((i) => (i.id === record.id ? { ...i, status } : i)));
    const patch: Partial<InjuryRecord> = { status };
    if (status === 'fit') patch.resolved_date = todayISO();
    const res = await apiService.updateInjury(record.id, patch);
    if (!res.success) {
      setInjuries(prev);
      Toast.show({ type: 'error', text1: 'Could not update', text2: res.error || 'Please try again' });
    }
  };

  const active = injuries.filter((i) => i.status !== 'fit');
  const resolved = injuries.filter((i) => i.status === 'fit');

  const renderCard = (injury: InjuryRecord) => (
    <PremiumCard key={injury.id} variant="elevated" padding="medium" style={StyleSheet.flatten([styles.injuryCard, { borderLeftWidth: 4, borderLeftColor: statusColor(injury.status) }])}>
      <View style={styles.injuryHeader}>
        <Text style={[styles.injuryTitle, { color: theme.colors.onSurface }]}>
          {injury.body_part} · {injury.injury_type}
        </Text>
        <Text style={[styles.injurySeverity, { color: theme.colors.onSurfaceVariant }]}>{injury.severity}</Text>
      </View>
      <Text style={[styles.injuryMeta, { color: theme.colors.onSurfaceVariant }]}>
        Reported {injury.date_reported.slice(5)}
        {injury.expected_return ? ` · return ~${injury.expected_return.slice(5)}` : ''}
      </Text>
      {injury.rehab_notes ? (
        <Text style={[styles.injuryNotes, { color: theme.colors.onSurfaceVariant }]}>{injury.rehab_notes}</Text>
      ) : null}
      <View style={styles.statusRow}>
        {STATUSES.map((s) => {
          const selected = s.value === injury.status;
          return (
            <TouchableOpacity
              key={s.value}
              activeOpacity={0.8}
              onPress={() => changeStatus(injury, s.value)}
              style={[styles.statusChip, { backgroundColor: selected ? statusColor(s.value) : theme.colors.surfaceVariant, borderColor: selected ? statusColor(s.value) : theme.colors.outline }]}
            >
              <Text style={{ color: selected ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 12 }}>{s.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </PremiumCard>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <PremiumCard variant="elevated" padding="large">
        <Text style={[styles.formTitle, { color: theme.colors.onSurface }]}>Log a new injury</Text>
        <TextInput mode="outlined" label="Body part (e.g. lower back)" value={bodyPart} onChangeText={setBodyPart} style={styles.input} />
        <TextInput mode="outlined" label="Type (e.g. strain)" value={injuryType} onChangeText={setInjuryType} style={styles.input} />

        <Text style={[styles.fieldLabel, { color: theme.colors.onSurface }]}>Severity</Text>
        <View style={styles.chips}>
          {SEVERITIES.map((s) => {
            const selected = s === severity;
            return (
              <TouchableOpacity
                key={s}
                activeOpacity={0.8}
                onPress={() => setSeverity(s)}
                style={[styles.chip, { backgroundColor: selected ? colors.cricket.red : theme.colors.surfaceVariant, borderColor: selected ? colors.cricket.red : theme.colors.outline }]}
              >
                <Text style={{ color: selected ? '#fff' : theme.colors.onSurfaceVariant, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' }}>{s}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TextInput mode="outlined" label="Expected return (YYYY-MM-DD, optional)" value={expectedReturn} onChangeText={setExpectedReturn} style={styles.input} autoCapitalize="none" />
        <TextInput mode="outlined" label="Rehab notes (optional)" value={rehabNotes} onChangeText={setRehabNotes} multiline style={styles.input} />
        <PremiumButton title={saving ? 'Saving…' : 'Add injury'} onPress={handleAdd} loading={saving} fullWidth size="large" />
      </PremiumCard>

      {active.length > 0 && (
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Active</Text>
          {active.map(renderCard)}
        </View>
      )}

      {resolved.length > 0 && (
        <View style={styles.listSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>Resolved</Text>
          {resolved.map(renderCard)}
        </View>
      )}

      {injuries.length === 0 && (
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>No injuries logged. Stay fit! 💪</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  formTitle: { fontWeight: '700', fontSize: 16, marginBottom: spacing.md },
  input: { marginBottom: spacing.md },
  fieldLabel: { fontWeight: '600', fontSize: 15, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: borderRadius.round, borderWidth: 1 },
  listSection: { gap: spacing.md },
  sectionTitle: { fontWeight: '700', fontSize: 17, marginBottom: spacing.xs },
  injuryCard: {},
  injuryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  injuryTitle: { fontWeight: '700', fontSize: 15, flex: 1, textTransform: 'capitalize' },
  injurySeverity: { fontSize: 12, textTransform: 'capitalize' },
  injuryMeta: { fontSize: 12, marginTop: 4 },
  injuryNotes: { fontSize: 13, marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  statusChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.round, borderWidth: 1 },
  emptyText: { textAlign: 'center', fontSize: 14, marginTop: spacing.xl },
});
