import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
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

// Lightweight markdown renderer for the subset the report uses: ### headings,
// "-"/"*" bullets, **bold**, and plain paragraphs. Avoids adding a dependency.
function Markdown({
  md,
  color,
  subColor,
  accent = colors.cricket.orange,
}: {
  md: string;
  color: string;
  subColor: string;
  accent?: string;
}) {
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
          return <InlineText key={i} text={line.slice(2)} style={[styles.h2, { color }]} />;
        }
        const bullet = line.match(/^\s*[-*]\s+(.*)$/);
        if (bullet) {
          return (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: accent }]} />
              <InlineText text={bullet[1]} style={[styles.body, { color: subColor, flex: 1 }]} />
            </View>
          );
        }
        return <InlineText key={i} text={line} style={[styles.body, { color: subColor }]} />;
      })}
    </View>
  );
}

// Split the report markdown into ## sections so each renders as its own card.
function splitSections(md: string): { title: string; body: string }[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const sections: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      current = { title: m[1].trim(), body: [] };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    }
  }
  return sections.map((s) => ({ title: s.title, body: s.body.join('\n').trim() }));
}

// Pick an icon + accent color for a section based on its title.
function sectionMeta(title: string): { icon: string; color: string } {
  const t = title.toLowerCase();
  if (t.includes('summary')) return { icon: '📊', color: colors.cricket.blue };
  if (t.includes('wellness')) return { icon: '😴', color: colors.cricket.blue };
  if (t.includes('acwr') || t.includes('workload') || t.includes('injury risk') || t.includes('load'))
    return { icon: '🏋️', color: colors.cricket.green };
  if (t.includes('fitness')) return { icon: '⚡', color: colors.cricket.orange };
  if (t.includes('flag') || t.includes('watch')) return { icon: '⚠️', color: colors.error };
  if (t.includes('recommend')) return { icon: '✅', color: colors.success };
  return { icon: '📋', color: colors.cricket.orange };
}

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Monday (ISO yyyy-mm-dd) of the calendar week containing today. Matches the
// backend, which stores one report per (user, Monday-of-week).
const currentWeekStartISO = () => {
  const d = new Date();
  const day = d.getDay(); // 0=Sun .. 6=Sat
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().slice(0, 10);
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

  // One report per calendar week: lock generation once this week's report exists.
  const hasThisWeekReport = !!report && report.week_start === currentWeekStartISO();
  const sections = report ? splitSections(report.report_md) : [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {report ? (
        <>
          {/* Hero banner */}
          <Animated.View entering={FadeInDown.springify()}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>WEEKLY REPORT</Text>
              <Text style={styles.heroTitle}>
                {fmtDate(report.week_start)} – {fmtDate(report.week_end)}
              </Text>
              {report.generated_at ? (
                <Text style={styles.heroMeta}>
                  Updated {new Date(report.generated_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              ) : null}
            </LinearGradient>
          </Animated.View>

          {/* Section cards */}
          {sections.length > 0 ? (
            sections.map((s, idx) => {
              const meta = sectionMeta(s.title);
              return (
                <Animated.View key={s.title + idx} entering={FadeInDown.delay(80 + idx * 60).springify()}>
                  <PremiumCard
                    variant="elevated"
                    padding="large"
                    style={StyleSheet.flatten([styles.sectionCard, { borderTopColor: meta.color }])}
                  >
                    <View style={styles.sectionHead}>
                      <View style={[styles.iconBadge, { backgroundColor: meta.color + '20' }]}>
                        <Text style={styles.iconText}>{meta.icon}</Text>
                      </View>
                      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>{s.title}</Text>
                    </View>
                    {s.body ? (
                      <Markdown
                        md={s.body}
                        color={theme.colors.onSurface}
                        subColor={theme.colors.onSurfaceVariant}
                        accent={meta.color}
                      />
                    ) : null}
                  </PremiumCard>
                </Animated.View>
              );
            })
          ) : (
            <PremiumCard variant="elevated" padding="large">
              <Markdown
                md={report.report_md}
                color={theme.colors.onSurface}
                subColor={theme.colors.onSurfaceVariant}
              />
            </PremiumCard>
          )}
        </>
      ) : null}

      {hasThisWeekReport ? (
        // Already generated for the current week — locked until next week.
        <PremiumCard
          variant="elevated"
          padding="large"
          style={StyleSheet.flatten([styles.noticeCard, { borderTopColor: colors.success }])}
        >
          <Text style={[styles.lockedTitle, { color: colors.success }]}>✓ This week&apos;s report is ready</Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }]}>
            Only one report is generated per week. Your next report will be available next week.
          </Text>
        </PremiumCard>
      ) : (
        // No report yet for the current week — allow a single generation.
        <PremiumCard variant="elevated" padding="large">
          <Text style={[styles.weekRange, { color: theme.colors.onSurface }]}>
            {report ? "Generate this week's report" : 'No report yet'}
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }]}>
            {report
              ? 'You can generate one report for the current week.'
              : 'Your weekly report is generated automatically once you have a week of logged data. You can also generate one now.'}
          </Text>
          <View style={[styles.tipBox, { backgroundColor: colors.cricket.orange + '14' }]}>
            <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant }]}>
              💡 For the most complete report, generate it at the end of the week — only one report is
              allowed per week.
            </Text>
          </View>
          <View style={{ height: spacing.lg }} />
          <PremiumButton
            title={generating ? 'Generating…' : "Generate this week's report"}
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
  content: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Hero
  hero: { borderRadius: 20, padding: spacing.lg, overflow: 'hidden' },
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: { color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },

  // Section cards
  sectionCard: { borderTopWidth: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  iconBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 20 },
  sectionTitle: { fontWeight: '700', fontSize: 16, flex: 1, letterSpacing: -0.3 },

  // Notice / generate cards
  noticeCard: { borderTopWidth: 4 },
  weekRange: { fontWeight: '700', fontSize: 18 },
  lockedTitle: { fontWeight: '700', fontSize: 16 },
  tipBox: { borderRadius: 12, padding: spacing.md, marginTop: spacing.md },
  tip: { fontSize: 13, lineHeight: 19 },

  // Markdown body
  h2: { fontWeight: '700', fontSize: 15, marginTop: spacing.sm, marginBottom: spacing.xs },
  h3: { fontWeight: '700', fontSize: 14, marginTop: spacing.sm, marginBottom: spacing.xs },
  body: { fontSize: 14, lineHeight: 22 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginVertical: 3, paddingRight: spacing.sm },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
});
