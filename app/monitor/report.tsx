import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { colors, spacing } from '../../src/theme';
import apiService from '../../src/services/api';
import { WeeklyReport } from '../../src/types';

// Render inline **bold** spans inside a line of text.
function InlineText({ text, style }: { text: string; style: any }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

// Lightweight markdown renderer for the subset the report uses: #/##/### headings,
// "-"/"*" bullets, **bold**, and plain paragraphs. Avoids adding a dependency.
function Markdown({ md, color, subColor }: { md: string; color: string; subColor: string }) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: spacing.sm }} />;

        if (line.startsWith('### ')) {
          return <InlineText key={i} text={line.slice(4)} style={[styles.h3, { color }]} />;
        }
        if (line.startsWith('## ')) {
          return <InlineText key={i} text={line.slice(3)} style={[styles.h2, { color }]} />;
        }
        if (line.startsWith('# ')) {
          return <InlineText key={i} text={line.slice(2)} style={[styles.h1, { color }]} />;
        }
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.cricket.orange }]}>•</Text>
              <InlineText text={bullet[1]} style={[styles.body, { color: subColor, flex: 1 }]} />
            </View>
          );
        }
        return <InlineText key={i} text={line} style={[styles.body, { color: subColor }]} />;
      })}
    </View>
  );
}

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function WeeklyReportScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await apiService.getWeeklyReport();
    if (res.success) setReport(res.data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await apiService.generateWeeklyReport();
    setGenerating(false);
    if (res.success && res.data) {
      setReport(res.data);
      Toast.show({ type: 'success', text1: 'Report generated' });
    } else if (res.success && !res.data) {
      Toast.show({
        type: 'info',
        text1: 'Not enough data yet',
        text2: 'Log some wellness or training sessions this week first.',
      });
    } else {
      Toast.show({ type: 'error', text1: 'Could not generate', text2: res.error || 'Please try again' });
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={colors.cricket.orange} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      {report ? (
        <>
          <PremiumCard variant="elevated" padding="large">
            <Text style={[styles.weekRange, { color: theme.colors.onSurface }]}>
              Week of {fmtDate(report.week_start)} – {fmtDate(report.week_end)}
            </Text>
            {report.generated_at ? (
              <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
                Generated {new Date(report.generated_at).toLocaleString()}
              </Text>
            ) : null}
            <View style={{ height: spacing.md }} />
            <Markdown
              md={report.report_md}
              color={theme.colors.onSurface}
              subColor={theme.colors.onSurfaceVariant}
            />
          </PremiumCard>

          <PremiumButton
            title={generating ? 'Regenerating…' : 'Regenerate for this week'}
            onPress={handleGenerate}
            loading={generating}
            fullWidth
            size="large"
            variant="secondary"
          />
        </>
      ) : (
        <PremiumCard variant="elevated" padding="large">
          <Text style={[styles.weekRange, { color: theme.colors.onSurface }]}>No report yet</Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }]}>
            Your weekly report is generated automatically once you have a week of logged wellness and
            training data. You can also generate one now from the data logged so far.
          </Text>
          <View style={{ height: spacing.lg }} />
          <PremiumButton
            title={generating ? 'Generating…' : 'Generate now'}
            onPress={handleGenerate}
            loading={generating}
            fullWidth
            size="large"
          />
        </PremiumCard>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekRange: { fontWeight: '700', fontSize: 18 },
  meta: { fontSize: 12, marginTop: 2 },
  h1: { fontWeight: '800', fontSize: 20, marginTop: spacing.md, marginBottom: spacing.xs },
  h2: { fontWeight: '700', fontSize: 16, marginTop: spacing.md, marginBottom: spacing.xs },
  h3: { fontWeight: '700', fontSize: 14, marginTop: spacing.sm, marginBottom: spacing.xs },
  body: { fontSize: 14, lineHeight: 21 },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, marginVertical: 2, paddingRight: spacing.sm },
  bulletDot: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
});
