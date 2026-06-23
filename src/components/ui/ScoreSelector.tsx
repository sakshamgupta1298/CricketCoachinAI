import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { borderRadius, spacing } from '../../theme';

interface ScoreSelectorProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number; // inclusive
  /** Optional captions for the low and high ends. */
  lowLabel?: string;
  highLabel?: string;
  color?: string;
}

/**
 * A compact horizontal 1–N picker (default 1–5) used by the wellness and
 * workload forms. Renders selectable pills; the chosen value is highlighted.
 */
export const ScoreSelector: React.FC<ScoreSelectorProps> = ({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  lowLabel,
  highLabel,
  color,
}) => {
  const theme = useTheme();
  const accent = color ?? theme.colors.primary;
  const options = [];
  for (let i = min; i <= max; i++) options.push(i);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.colors.onSurface }]}>{label}</Text>
      <View style={styles.row}>
        {options.map((opt) => {
          const selected = opt === value;
          return (
            <TouchableOpacity
              key={opt}
              activeOpacity={0.8}
              onPress={() => onChange(opt)}
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? accent : theme.colors.surfaceVariant,
                  borderColor: selected ? accent : theme.colors.outline,
                },
              ]}
            >
              <Text style={[styles.pillText, { color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }]}>
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {(lowLabel || highLabel) && (
        <View style={styles.captions}>
          <Text style={[styles.caption, { color: theme.colors.onSurfaceVariant }]}>{lowLabel}</Text>
          <Text style={[styles.caption, { color: theme.colors.onSurfaceVariant }]}>{highLabel}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: { fontWeight: '600', fontSize: 15, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontWeight: '700', fontSize: 16 },
  captions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  caption: { fontSize: 11 },
});
