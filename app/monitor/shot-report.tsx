import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { colors, spacing } from '../../src/theme';
import apiService from '../../src/services/api';
import { ShotCategory, ShotReport, StreakInfo } from '../../src/types';

const CATEGORIES: { key: ShotCategory; label: string; icon: string }[] = [
  { key: 'batting', label: 'Batting', icon: '🏏' },
  { key: 'bowling', label: 'Bowling', icon: '🎯' },
  { key: 'keeping', label: 'Keeping', icon: '🧤' },
];

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

// Lightweight markdown renderer: ### headings, "-"/"*" bullets, **bold**, paragraphs.
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

const fmtPct = (n: number | null | undefined) => {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}%`;
};
const pctColor = (n: number | null | undefined) =>
  n == null ? colors.cricket.blue : n > 0 ? colors.success : n < 0 ? colors.error : colors.cricket.blue;

export default function ShotReportScreen() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [category, setCategory] = useState<ShotCategory>('batting');
  const [report, setReport] = useState<ShotReport | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  // Load the report for a given category (streak is fetched once on mount).
  const loadReport = async (cat: ShotCategory) => {
    setLoading(true);
    const rep = await apiService.getShotReport(cat);
    setReport(rep.success ? rep.data ?? null : null);
    setLoading(false);
  };

  useEffect(() => {
    apiService.getStreak().then((st) => {
      if (st.success) setStreak(st.data ?? null);
    });
  }, []);

  // Re-fetch whenever the selected discipline changes.
  useEffect(() => {
    loadReport(category);
  }, [category]);

  const handleSelectCategory = (cat: ShotCategory) => {
    if (cat !== category) setCategory(cat);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await apiService.generateShotReport(category);
    setGenerating(false);
    const label = CATEGORIES.find((c) => c.key === category)?.label ?? 'this';
    if (res.success && res.data) {
      setReport(res.data);
      Toast.show({ type: 'success', text1: `${label} report generated` });
    } else if (res.success && !res.data) {
      Toast.show({
        type: 'info',
        text1: `No ${label.toLowerCase()} videos this week`,
        text2: `Analyze a ${label.toLowerCase()} video this week, then generate your report.`,
      });
    } else {
      Toast.show({ type: 'error', text1: 'Could not generate', text2: res.error || 'Please try again' });
    }
  };

  // One report per calendar week per category: lock generation once it exists.
  const hasThisWeekReport =
    !!report && report.week_start === currentWeekStartISO() && (report.category ?? 'batting') === category;
  const stats = report?.stats ?? null;
  const activeLabel = CATEGORIES.find((c) => c.key === category)?.label ?? 'Batting';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Streak banner */}
      {streak ? (
        <Animated.View entering={FadeInDown.springify()}>
          <PremiumCard
            variant="elevated"
            padding="medium"
            style={StyleSheet.flatten([styles.streakCard, { borderLeftColor: colors.cricket.orange }])}
          >
            <Text style={styles.streakEmoji}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.streakValue, { color: theme.colors.onSurface }]}>
                {streak.current_streak} day{streak.current_streak === 1 ? '' : 's'} streak
              </Text>
              <Text style={[styles.streakSub, { color: theme.colors.onSurfaceVariant }]}>
                {streak.active_today
                  ? 'Analyzed today — keep it going!'
                  : 'Analyze a video today to extend it'}
                {streak.longest_streak ? `  ·  Best: ${streak.longest_streak}` : ''}
              </Text>
            </View>
          </PremiumCard>
        </Animated.View>
      ) : null}

      {/* Discipline selector — the report is scoped to the chosen one */}
      <View style={styles.selector}>
        {CATEGORIES.map((c) => {
          const active = c.key === category;
          return (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.85}
              onPress={() => handleSelectCategory(c.key)}
              style={StyleSheet.flatten([
                styles.segment,
                {
                  backgroundColor: active ? colors.cricket.orange : theme.colors.surface,
                  borderColor: active ? colors.cricket.orange : theme.colors.outlineVariant,
                },
              ])}
            >
              <Text style={[styles.segmentText, { color: active ? 'white' : theme.colors.onSurfaceVariant }]}>
                {c.icon} {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator color={colors.cricket.orange} />
        </View>
      ) : (
        <>
      {report ? (
        <>
          {/* Hero banner */}
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>SHOT PROGRESS</Text>
              <Text style={styles.heroTitle}>
                {fmtDate(report.week_start)} – {fmtDate(report.week_end)}
              </Text>
              {stats ? (
                <Text style={styles.heroMeta}>
                  {stats.total_videos} video{stats.total_videos === 1 ? '' : 's'} ·{' '}
                  {stats.shots_practiced} shot{stats.shots_practiced === 1 ? '' : 's'} practiced
                </Text>
              ) : null}
            </LinearGradient>
          </Animated.View>

          {/* Per-shot stat cards (computed numbers) */}
          {stats?.shot_groups?.map((g, idx) => (
            <Animated.View key={g.shot + idx} entering={FadeInDown.delay(100 + idx * 60).springify()}>
              <PremiumCard
                variant="elevated"
                padding="large"
                style={StyleSheet.flatten([styles.shotCard, { borderTopColor: colors.cricket.green }])}
              >
                <View style={styles.shotHead}>
                  <Text style={[styles.shotName, { color: theme.colors.onSurface }]}>{g.shot}</Text>
                  <View style={[styles.pctPill, { backgroundColor: pctColor(g.net_improvement_pct) + '20' }]}>
                    <Text style={[styles.pctPillText, { color: pctColor(g.net_improvement_pct) }]}>
                      {fmtPct(g.net_improvement_pct)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.shotMeta, { color: theme.colors.onSurfaceVariant }]}>
                  {g.video_count} video{g.video_count === 1 ? '' : 's'} · avg score {g.avg_score}
                </Text>

                {/* Per-video progression */}
                <View style={styles.videoList}>
                  {g.videos.map((v, vi) => (
                    <View key={v.filename + vi} style={styles.videoRow}>
                      <Text style={[styles.videoIdx, { color: theme.colors.onSurfaceVariant }]}>
                        #{vi + 1}
                      </Text>
                      <Text style={[styles.videoDate, { color: theme.colors.onSurfaceVariant }]}>
                        {fmtDate(v.date)}
                      </Text>
                      <Text style={[styles.videoScore, { color: theme.colors.onSurface }]}>
                        {v.score}
                      </Text>
                      <Text style={[styles.videoPct, { color: pctColor(v.improvement_vs_prev_pct) }]}>
                        {vi === 0 ? 'baseline' : fmtPct(v.improvement_vs_prev_pct)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Common flaws for this shot */}
                {g.common_flaws.length > 0 ? (
                  <View style={styles.flawWrap}>
                    <Text style={[styles.flawTitle, { color: theme.colors.onSurface }]}>
                      Recurring flaws
                    </Text>
                    {g.common_flaws.map((f, fi) => (
                      <View key={f.feature + fi} style={styles.bulletRow}>
                        <View style={[styles.bulletDot, { backgroundColor: colors.error }]} />
                        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, flex: 1 }]}>
                          {f.feature}{' '}
                          <Text style={{ color: theme.colors.onSurfaceVariant, opacity: 0.7 }}>
                            ({f.count}/{f.of} videos)
                          </Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : g.video_count > 1 ? (
                  <Text style={[styles.noFlaw, { color: colors.success }]}>
                    ✓ No flaw recurred across these videos
                  </Text>
                ) : null}
              </PremiumCard>
            </Animated.View>
          ))}

          {/* AI narrative */}
          <Animated.View entering={FadeInDown.delay(140).springify()}>
            <PremiumCard
              variant="elevated"
              padding="large"
              style={StyleSheet.flatten([styles.shotCard, { borderTopColor: colors.cricket.orange }])}
            >
              <View style={styles.sectionHead}>
                <View style={[styles.iconBadge, { backgroundColor: colors.cricket.orange + '20' }]}>
                  <Text style={styles.iconText}>🤖</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Coach&apos;s analysis</Text>
              </View>
              <Markdown
                md={report.report_md}
                color={theme.colors.onSurface}
                subColor={theme.colors.onSurfaceVariant}
              />
            </PremiumCard>
          </Animated.View>
        </>
      ) : null}

      {hasThisWeekReport ? (
        <PremiumCard
          variant="elevated"
          padding="large"
          style={StyleSheet.flatten([styles.noticeCard, { borderTopColor: colors.success }])}
        >
          <Text style={[styles.lockedTitle, { color: colors.success }]}>
            ✓ This week&apos;s {activeLabel} report is ready
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }]}>
            Only one {activeLabel.toLowerCase()} report is generated per week. Switch disciplines above to
            generate a separate report, or come back next week.
          </Text>
        </PremiumCard>
      ) : (
        <PremiumCard variant="elevated" padding="large">
          <Text style={[styles.weekRange, { color: theme.colors.onSurface }]}>
            Generate this week&apos;s {activeLabel} report
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant, marginTop: spacing.sm }]}>
            This report compares every {activeLabel.toLowerCase()} video you analyzed this week — common
            flaws and your improvement from video to video. Best generated at the end of the week (Sunday).
          </Text>
          <View style={[styles.tipBox, { backgroundColor: colors.cricket.orange + '14' }]}>
            <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant }]}>
              💡 Analyze the same {category === 'batting' ? 'shot' : category === 'bowling' ? 'bowling type' : 'keeping skill'} a few times this week to see your improvement
              percentage. One report per discipline per week.
            </Text>
          </View>
          <View style={{ height: spacing.lg }} />
          <PremiumButton
            title={generating ? 'Generating…' : `Generate ${activeLabel} report`}
            onPress={handleGenerate}
            loading={generating}
            fullWidth
            size="large"
          />
        </PremiumCard>
      )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Streak
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderLeftWidth: 4 },
  streakEmoji: { fontSize: 28 },
  streakValue: { fontWeight: '800', fontSize: 18, letterSpacing: -0.3 },
  streakSub: { fontSize: 12, marginTop: 2 },

  // Discipline selector
  selector: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontWeight: '700', fontSize: 13 },
  inlineLoading: { paddingVertical: spacing.xl, alignItems: 'center' },

  // Hero
  hero: { borderRadius: 20, padding: spacing.lg, overflow: 'hidden' },
  heroEyebrow: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  heroTitle: { color: 'white', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  heroMeta: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },

  // Shot stat cards
  shotCard: { borderTopWidth: 4 },
  shotHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shotName: { fontWeight: '700', fontSize: 17, flex: 1, textTransform: 'capitalize', letterSpacing: -0.3 },
  pctPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  pctPillText: { fontWeight: '800', fontSize: 13 },
  shotMeta: { fontSize: 13, marginTop: 2 },
  videoList: { marginTop: spacing.md, gap: 6 },
  videoRow: { flexDirection: 'row', alignItems: 'center' },
  videoIdx: { width: 28, fontSize: 13, fontWeight: '700' },
  videoDate: { width: 64, fontSize: 13 },
  videoScore: { flex: 1, fontSize: 14, fontWeight: '700' },
  videoPct: { fontSize: 13, fontWeight: '700', textAlign: 'right', minWidth: 64 },
  flawWrap: { marginTop: spacing.md },
  flawTitle: { fontWeight: '700', fontSize: 14, marginBottom: spacing.xs },
  noFlaw: { marginTop: spacing.md, fontSize: 13, fontWeight: '600' },

  // Section / narrative
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
