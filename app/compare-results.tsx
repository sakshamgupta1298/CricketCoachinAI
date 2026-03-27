import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, ProgressBar, Surface, Text, useTheme } from 'react-native-paper';
import { borderRadius, colors, shadows, spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';
import { translateToHindi } from '../src/utils/translate';

interface ComparisonResult {
  overall_comparison: {
    video1_score: number;
    video2_score: number;
    improvement_percentage?: number;
    improvement_summary?: string;
    winner: 'video1' | 'video2' | 'tie';
    overall_summary: string;
  };
  metric_comparisons: Array<{
    metric_name: string;
    video1_value: string;
    video2_value: string;
    improvement_percentage?: number;
    difference_percentage?: number; // Keep for backward compatibility
    improvement_direction?: 'improved' | 'declined' | 'similar';
    better_performance: 'video1' | 'video2' | 'similar';
    analysis: string;
  }>;
  improvement_summary?: {
    overall_improvement: string;
    top_improvements: string[];
    areas_still_needing_work: string[];
  };
  key_insights: string[];
  improvement_areas: {
    video1: string[];
    video2: string[];
  };
  strengths: {
    video1: string[];
    video2: string[];
  };
  video1_filename: string;
  video2_filename: string;
}

export default function CompareResultsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  // Language: English or Hindi (translation + TTS)
  type Lang = 'en' | 'hi';
  const [language, setLanguage] = useState<Lang>('en');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [hindiTranslated, setHindiTranslated] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const initialTranslated = {
    overall_summary: null as string | null,
    overall_improvement_summary: null as string | null,
    improvement_summary: null as ComparisonResult['improvement_summary'] | null,
    key_insights: null as string[] | null,
    metric_comparisons: null as Array<{ metric_name: string; analysis: string }> | null,
    strengths: null as { video1: string[]; video2: string[] } | null,
    improvement_areas: null as { video1: string[]; video2: string[] } | null,
  };

  const [translated, setTranslated] = useState(initialTranslated);

  // Stop speech when user leaves this screen
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        setSpeaking(false);
      };
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    setRefreshing(false);
  };

  const comparisonParam = Array.isArray(params.comparison) ? params.comparison[0] : (params.comparison as any);
  const comparisonKey = comparisonParam ? String(comparisonParam) : '';

  const comparison: ComparisonResult | null = useMemo(() => {
    if (!comparisonParam) return null;
    try {
      const parsed = JSON.parse(comparisonParam as string);
      // Handle nested structure: { comparison: {...} } or direct {...}
      return parsed.comparison || parsed;
    } catch (error) {
      console.error('Error parsing comparison data:', error);
      console.error('Raw comparison data:', params.comparison);
      return null;
    }
  }, [comparisonKey]);

  // Reset Hindi translation cache when comparison changes
  useEffect(() => {
    setTranslated(initialTranslated);
    setHindiTranslated(false);
    setTranslateLoading(false);
    Speech.stop();
    setSpeaking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonKey]);

  const loadHindiTranslation = useCallback(async () => {
    if (!comparison) return;
    setTranslateLoading(true);
    try {
      const overall_summary = comparison.overall_comparison.overall_summary
        ? await translateToHindi(comparison.overall_comparison.overall_summary)
        : null;

      const overall_improvement_summary = comparison.overall_comparison.improvement_summary
        ? await translateToHindi(comparison.overall_comparison.improvement_summary)
        : null;

      let improvement_summary: ComparisonResult['improvement_summary'] | null = null;
      if (comparison.improvement_summary) {
        improvement_summary = {
          overall_improvement: await translateToHindi(comparison.improvement_summary.overall_improvement),
          top_improvements: await Promise.all(
            comparison.improvement_summary.top_improvements.map((s) => translateToHindi(s))
          ),
          areas_still_needing_work: await Promise.all(
            comparison.improvement_summary.areas_still_needing_work.map((s) => translateToHindi(s))
          ),
        };
      }

      const key_insights = await Promise.all(comparison.key_insights.map((s) => translateToHindi(s)));

      const metric_comparisons = await Promise.all(
        comparison.metric_comparisons.map(async (m) => ({
          metric_name: m.metric_name ? await translateToHindi(m.metric_name) : '',
          analysis: m.analysis ? await translateToHindi(m.analysis) : '',
        }))
      );

      const strengths = {
        video1: await Promise.all(comparison.strengths.video1.map((s) => translateToHindi(s))),
        video2: await Promise.all(comparison.strengths.video2.map((s) => translateToHindi(s))),
      };

      const improvement_areas = {
        video1: await Promise.all(comparison.improvement_areas.video1.map((s) => translateToHindi(s))),
        video2: await Promise.all(comparison.improvement_areas.video2.map((s) => translateToHindi(s))),
      };

      setTranslated({
        overall_summary: overall_summary || null,
        overall_improvement_summary: overall_improvement_summary || null,
        improvement_summary,
        key_insights,
        metric_comparisons,
        strengths,
        improvement_areas,
      });
    } catch (e) {
      console.warn('Hindi translation failed', e);
    } finally {
      setTranslateLoading(false);
      setHindiTranslated(true);
    }
  }, [comparison]);

  useEffect(() => {
    if (language === 'hi' && comparison && !hindiTranslated && !translateLoading) {
      loadHindiTranslation();
    }
  }, [language, comparison, hindiTranslated, translateLoading, loadHindiTranslation]);

  const getFullTextForSpeech = useCallback((): string => {
    if (!comparison) return '';
    const isHi = language === 'hi';

    const parts: string[] = [];
    // Start with clear headings so TTS sounds structured.
    parts.push(isHi ? 'तुलना परिणाम.' : 'Comparison Results.');
    parts.push(isHi ? 'कुल प्रदर्शन.' : 'Overall Performance.');
    parts.push(
      isHi
        ? `पिछला स्कोर: ${comparison.overall_comparison.video1_score} प्रतिशत.`
        : `Previous score: ${comparison.overall_comparison.video1_score}%.`
    );
    parts.push(
      isHi
        ? `वर्तमान स्कोर: ${comparison.overall_comparison.video2_score} प्रतिशत.`
        : `Current score: ${comparison.overall_comparison.video2_score}%.`
    );

    const improvementPercentage =
      comparison.overall_comparison.improvement_percentage !== undefined
        ? comparison.overall_comparison.improvement_percentage
        : comparison.overall_comparison.video1_score > 0
          ? ((comparison.overall_comparison.video2_score - comparison.overall_comparison.video1_score) /
              comparison.overall_comparison.video1_score) *
            100
          : comparison.overall_comparison.video2_score - comparison.overall_comparison.video1_score;

    parts.push(
      isHi
        ? `सुधार: ${improvementPercentage >= 0 ? '+' : ''}${improvementPercentage.toFixed(1)} प्रतिशत.`
        : `Improvement from Previous to Current: ${improvementPercentage >= 0 ? '+' : ''}${improvementPercentage.toFixed(1)}%.`
    );

    if (comparison.overall_comparison.improvement_summary) {
      parts.push(isHi ? 'समग्र सुधार सारांश.' : 'Improvement Summary.');
      parts.push(
        isHi && translated.overall_improvement_summary
          ? translated.overall_improvement_summary
          : comparison.overall_comparison.improvement_summary
      );
    }

    const winnerText =
      comparison.overall_comparison.winner === 'video1'
        ? isHi
          ? 'पिछला वीडियो बेहतर प्रदर्शन करता है।'
          : 'Previous performs better'
        : comparison.overall_comparison.winner === 'video2'
          ? isHi
            ? 'वर्तमान वीडियो बेहतर प्रदर्शन करता है।'
            : 'Current performs better'
          : isHi
            ? 'दोनों का प्रदर्शन समान है।'
            : 'Similar Performance';
    parts.push(winnerText);

    const overallSummary =
      isHi && translated.overall_summary ? translated.overall_summary : comparison.overall_comparison.overall_summary;
    if (overallSummary) {
      parts.push(isHi ? 'सारांश.' : 'Summary.');
      parts.push(overallSummary);
    }

    if (comparison.improvement_summary) {
      parts.push(isHi ? 'सुधार सारांश.' : 'Improvement Summary.');
      const t = translated.improvement_summary;
      parts.push(t?.overall_improvement || comparison.improvement_summary.overall_improvement);

      parts.push(isHi ? 'शीर्ष सुधार.' : 'Top Improvements.');
      const top = t?.top_improvements || comparison.improvement_summary.top_improvements;
      top.forEach((s) => parts.push(s));

      parts.push(isHi ? 'वे क्षेत्र जिन पर अब भी काम चाहिए.' : 'Areas Still Needing Work.');
      const areas = t?.areas_still_needing_work || comparison.improvement_summary.areas_still_needing_work;
      areas.forEach((s) => parts.push(s));
    }

    parts.push(isHi ? 'मेट्रिक तुलना.' : 'Metric Comparisons.');
    comparison.metric_comparisons.forEach((metric, i) => {
      const tMetric = translated.metric_comparisons?.[i];
      const metricName = isHi && tMetric?.metric_name ? tMetric.metric_name : metric.metric_name;
      const analysis = isHi && tMetric?.analysis ? tMetric.analysis : metric.analysis;

      parts.push(isHi ? `मेट्रिक ${i + 1}.` : `Metric ${i + 1}.`);
      parts.push(`${metricName}.`);
      parts.push(isHi ? `पिछला: ${metric.video1_value}.` : `Previous: ${metric.video1_value}.`);
      parts.push(isHi ? `वर्तमान: ${metric.video2_value}.` : `Current: ${metric.video2_value}.`);
      parts.push(isHi ? `विश्लेषण: ${analysis}.` : `Analysis: ${analysis}.`);
    });

    if (comparison.key_insights?.length) {
      parts.push(isHi ? 'मुख्य अंतर्दृष्टि.' : 'Key Insights.');
      const insights = translated.key_insights || comparison.key_insights;
      insights.forEach((s) => parts.push(s));
    }

    if (comparison.strengths?.video1?.length || comparison.strengths?.video2?.length) {
      parts.push(isHi ? 'ताकत.' : 'Strengths.');
      const strengths = translated.strengths;
      const s1 = strengths?.video1 || comparison.strengths.video1;
      const s2 = strengths?.video2 || comparison.strengths.video2;
      parts.push(isHi ? 'पिछला ताकत:' : 'Previous strengths:');
      s1.forEach((s) => parts.push(s));
      parts.push(isHi ? 'वर्तमान ताकत:' : 'Current strengths:');
      s2.forEach((s) => parts.push(s));
    }

    if (comparison.improvement_areas?.video1?.length || comparison.improvement_areas?.video2?.length) {
      parts.push(isHi ? 'सुधार क्षेत्र.' : 'Areas for Improvement.');
      const areas = translated.improvement_areas;
      const a1 = areas?.video1 || comparison.improvement_areas.video1;
      const a2 = areas?.video2 || comparison.improvement_areas.video2;
      parts.push(isHi ? 'पिछला:' : 'Previous:');
      a1.forEach((s) => parts.push(s));
      parts.push(isHi ? 'वर्तमान:' : 'Current:');
      a2.forEach((s) => parts.push(s));
    }

    // New lines create natural pauses so headings sound like headings.
    return parts.filter(Boolean).join('\n');
  }, [comparison, language, translated]);

  const handleSpeak = useCallback(() => {
    const text = getFullTextForSpeech();
    if (!text.trim()) return;

    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    Speech.speak(text, {
      language: language === 'hi' ? 'hi-IN' : 'en-US',
      onDone: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [getFullTextForSpeech, language, speaking]);

  if (!comparison || !comparison.overall_comparison) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(24) }]}>
            {language === 'hi' ? 'तुलना परिणाम' : 'Comparison Results'}
          </Text>
        </Surface>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {language === 'hi' ? 'कोई तुलना डेटा उपलब्ध नहीं है' : 'No comparison data available'}
          </Text>
          <Text style={[styles.errorSubtext, { color: theme.colors.onSurfaceVariant }]}>
            {comparison
              ? language === 'hi'
                ? 'अमान्य तुलना डेटा संरचना'
                : 'Invalid comparison data structure'
              : language === 'hi'
                ? 'कृपया फिर से तुलना करें'
                : 'Please try comparing again'}
          </Text>
          {params.comparison && (
            <Text style={[styles.debugText, { color: theme.colors.onSurfaceVariant }]}>
              Debug: {JSON.stringify(comparison, null, 2).substring(0, 200)}
            </Text>
          )}
        </View>
      </View>
    );
  }

  const video1Name = language === 'hi' ? 'पिछला' : 'Previous';
  const video2Name = language === 'hi' ? 'वर्तमान' : 'Current';

  const getWinnerColor = (winner: string) => {
    if (winner === 'video1') return colors.cricket.green;
    if (winner === 'video2') return colors.cricket.blue;
    return colors.cricket.orange;
  };

  const getPerformanceColor = (performance: string) => {
    if (performance === 'video1') return colors.cricket.green;
    if (performance === 'video2') return colors.cricket.blue;
    return '#999999';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(24) }]}>
          {language === 'hi' ? 'तुलना परिणाम' : 'Comparison Results'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
          {language === 'hi' ? 'पिछला बनाम वर्तमान प्रदर्शन' : 'Previous vs Current Performance'}
        </Text>
      </Surface>

      {/* Language toggle and Speak */}
      <View style={styles.languageBar}>
        <View style={styles.languageToggle}>
          <TouchableOpacity
            style={[
              styles.langButton,
              language === 'en' && styles.langButtonActive,
              { borderColor: theme.colors.outline, backgroundColor: language === 'en' ? theme.colors.primary : theme.colors.surface },
            ]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langButtonText, { color: language === 'en' ? 'white' : theme.colors.onSurface }]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.langButton,
              language === 'hi' && styles.langButtonActive,
              { borderColor: theme.colors.outline, backgroundColor: language === 'hi' ? theme.colors.primary : theme.colors.surface },
            ]}
            onPress={() => setLanguage('hi')}
            disabled={translateLoading}
          >
            {translateLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.langButtonText, { color: language === 'hi' ? 'white' : theme.colors.onSurface }]}>
                हिंदी
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[
            styles.speakButton,
            { backgroundColor: theme.colors.secondary, opacity: translateLoading ? 0.6 : 1 },
          ]}
          onPress={handleSpeak}
          disabled={translateLoading}
        >
          <Text style={styles.speakButtonText}>{speaking ? '⏹ Stop' : '🔊 Speak'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overall Comparison */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              {language === 'hi' ? 'कुल प्रदर्शन' : 'Overall Performance'}
            </Text>
            
            <View style={styles.scoreContainer}>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                  {language === 'hi' ? 'पिछला' : 'Previous'}
                </Text>
                <Text style={[styles.scoreValue, { color: colors.cricket.green, fontSize: getResponsiveFontSize(32) }]}>
                  {comparison.overall_comparison.video1_score}%
                </Text>
                <ProgressBar 
                  progress={comparison.overall_comparison.video1_score / 100} 
                  color={colors.cricket.green}
                  style={styles.progressBar}
                />
              </View>
              
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                  {language === 'hi' ? 'वर्तमान' : 'Current'}
                </Text>
                <Text style={[styles.scoreValue, { color: colors.cricket.blue, fontSize: getResponsiveFontSize(32) }]}>
                  {comparison.overall_comparison.video2_score}%
                </Text>
                <ProgressBar 
                  progress={comparison.overall_comparison.video2_score / 100} 
                  color={colors.cricket.blue}
                  style={styles.progressBar}
                />
              </View>
            </View>

            {/* Improvement Percentage */}
            <View style={styles.improvementPercentageContainer}>
              <Text style={[styles.improvementLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
                {language === 'hi' ? 'पिछले से वर्तमान तक सुधार:' : 'Improvement from Previous to Current:'}
              </Text>
              <View style={styles.improvementValueWrapper}>
                <Text 
                  style={[
                    styles.improvementValue, 
                    { 
                      color: (comparison.overall_comparison.improvement_percentage ?? 
                        ((comparison.overall_comparison.video2_score - comparison.overall_comparison.video1_score) / Math.max(comparison.overall_comparison.video1_score, 1)) * 100) >= 0 
                        ? colors.cricket.green 
                        : colors.cricket.orange,
                      fontSize: getResponsiveFontSize(32),
                      fontWeight: 'bold',
                    }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {(() => {
                    const improvementPercentage = comparison.overall_comparison.improvement_percentage !== undefined
                      ? comparison.overall_comparison.improvement_percentage
                      : comparison.overall_comparison.video1_score > 0
                        ? ((comparison.overall_comparison.video2_score - comparison.overall_comparison.video1_score) / comparison.overall_comparison.video1_score) * 100
                        : comparison.overall_comparison.video2_score - comparison.overall_comparison.video1_score;
                    return `${improvementPercentage >= 0 ? '+' : ''}${improvementPercentage.toFixed(1)}%`;
                  })()}
                </Text>
              </View>
              {comparison.overall_comparison.improvement_summary && (
                <Text style={[styles.improvementSummary, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                  {language === 'hi' && translated.overall_improvement_summary
                    ? translated.overall_improvement_summary
                    : comparison.overall_comparison.improvement_summary}
                </Text>
              )}
            </View>

            <View style={styles.winnerContainer}>
              <Chip
                mode="flat"
                style={[styles.winnerChip, { backgroundColor: getWinnerColor(comparison.overall_comparison.winner) }]}
                textStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                {comparison.overall_comparison.winner === 'video1' 
                  ? language === 'hi'
                    ? 'पिछला वीडियो बेहतर'
                    : 'Previous performs better'
                  : comparison.overall_comparison.winner === 'video2'
                  ? language === 'hi'
                    ? 'वर्तमान वीडियो बेहतर'
                    : 'Current performs better'
                  : language === 'hi'
                    ? 'दोनों का प्रदर्शन समान'
                    : 'Similar Performance'}
              </Chip>
            </View>

            <Text style={[styles.summaryText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
              {language === 'hi' && translated.overall_summary ? translated.overall_summary : comparison.overall_comparison.overall_summary}
            </Text>
          </Card.Content>
        </Card>

        {/* Improvement Summary */}
        {comparison.improvement_summary && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
                {language === 'hi' ? 'सुधार सारांश' : 'Improvement Summary'}
              </Text>
              
              {comparison.improvement_summary.overall_improvement && (
                <Text style={[styles.improvementText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(15) }]}>
                  {language === 'hi' && translated.improvement_summary?.overall_improvement
                    ? translated.improvement_summary.overall_improvement
                    : comparison.improvement_summary.overall_improvement}
                </Text>
              )}

              {comparison.improvement_summary.top_improvements && comparison.improvement_summary.top_improvements.length > 0 && (
                <View style={styles.improvementsList}>
                  <Text style={[styles.improvementsTitle, { color: colors.cricket.green, fontSize: getResponsiveFontSize(16), fontWeight: '600' }]}>
                    {language === 'hi' ? 'शीर्ष सुधार:' : 'Top Improvements:'}
                  </Text>
                  {(language === 'hi' && translated.improvement_summary?.top_improvements
                    ? translated.improvement_summary.top_improvements
                    : comparison.improvement_summary.top_improvements
                  ).map((improvement, index) => (
                    <View key={index} style={styles.improvementItem}>
                      <Text style={[styles.improvementBullet, { color: colors.cricket.green }]}>✓</Text>
                      <Text style={[styles.improvementText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                        {improvement}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {comparison.improvement_summary.areas_still_needing_work && comparison.improvement_summary.areas_still_needing_work.length > 0 && (
                <View style={styles.improvementsList}>
                  <Text style={[styles.improvementsTitle, { color: colors.cricket.orange, fontSize: getResponsiveFontSize(16), fontWeight: '600' }]}>
                    {language === 'hi' ? 'वे क्षेत्र जिन पर अब भी काम चाहिए:' : 'Areas Still Needing Work:'}
                  </Text>
                  {(language === 'hi' && translated.improvement_summary?.areas_still_needing_work
                    ? translated.improvement_summary.areas_still_needing_work
                    : comparison.improvement_summary.areas_still_needing_work
                  ).map((area, index) => (
                    <View key={index} style={styles.improvementItem}>
                      <Text style={[styles.improvementBullet, { color: colors.cricket.orange }]}>→</Text>
                      <Text style={[styles.improvementText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                        {area}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Metric Comparisons */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              {language === 'hi' ? 'मेट्रिक तुलना' : 'Metric Comparisons'}
            </Text>
            
            {comparison.metric_comparisons.map((metric, index) => (
              <View key={index} style={styles.metricItem}>
                <Text style={[styles.metricName, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
                  {language === 'hi' && translated.metric_comparisons?.[index]?.metric_name
                    ? translated.metric_comparisons[index].metric_name
                    : metric.metric_name}
                </Text>
                
                <View style={styles.metricValues}>
                  <View style={styles.metricValueItem}>
                    <Text style={[styles.metricValueLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
                      {video1Name}
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                      {metric.video1_value}
                    </Text>
                  </View>
                  
                  <View style={styles.metricValueItem}>
                    <Text style={[styles.metricValueLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
                      {video2Name}
                    </Text>
                    <Text style={[styles.metricValue, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                      {metric.video2_value}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricAnalysis}>
                  {(metric.improvement_percentage !== undefined || metric.difference_percentage !== undefined) && (
                    <Chip
                      mode="flat"
                      style={[
                        styles.improvementChip, 
                        { 
                          backgroundColor: (metric.improvement_percentage ?? metric.difference_percentage ?? 0) >= 0 
                            ? colors.cricket.green + '20' 
                            : colors.cricket.orange + '20'
                        }
                      ]}
                      textStyle={{ 
                        color: (metric.improvement_percentage ?? metric.difference_percentage ?? 0) >= 0 
                          ? colors.cricket.green 
                          : colors.cricket.orange,
                        fontSize: getResponsiveFontSize(13),
                        fontWeight: '600'
                      }}
                    >
                      {metric.improvement_percentage !== undefined ? (
                        <>
                          {metric.improvement_direction === 'improved' ? '↑' : metric.improvement_direction === 'declined' ? '↓' : '→'} 
                          {' '}
                          {metric.improvement_percentage >= 0 ? '+' : ''}
                          {metric.improvement_percentage.toFixed(1)}% {language === 'hi' ? 'सुधार' : 'Improvement'}
                        </>
                      ) : (
                        `${language === 'hi' ? 'अंतर' : 'Difference'}: ${Math.abs(metric.difference_percentage ?? 0).toFixed(1)}%`
                      )}
                    </Chip>
                  )}
                  <Text style={[styles.metricAnalysisText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
                    {language === 'hi' && translated.metric_comparisons?.[index]?.analysis
                      ? translated.metric_comparisons[index].analysis
                      : metric.analysis}
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Key Insights */}
        {comparison.key_insights && comparison.key_insights.length > 0 && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
                {language === 'hi' ? 'मुख्य अंतर्दृष्टि' : 'Key Insights'}
              </Text>
              {comparison.key_insights.map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <Text style={[styles.insightBullet, { color: theme.colors.primary }]}>•</Text>
                  <Text style={[styles.insightText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                    {language === 'hi' && translated.key_insights?.[index] ? translated.key_insights[index] : insight}
                  </Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Strengths */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              {language === 'hi' ? 'ताकत' : 'Strengths'}
            </Text>
            
            <View style={styles.strengthsContainer}>
              <View style={styles.strengthColumn}>
                <Text style={[styles.strengthTitle, { color: colors.cricket.green, fontSize: getResponsiveFontSize(16) }]}>
                  {video1Name}
                </Text>
                {comparison.strengths.video1.map((strength, index) => (
                  <View key={index} style={styles.strengthItem}>
                    <Text style={[styles.strengthBullet, { color: colors.cricket.green }]}>✓</Text>
                    <Text style={[styles.strengthText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(13) }]}>
                      {language === 'hi' && translated.strengths?.video1?.[index] ? translated.strengths.video1[index] : strength}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.strengthColumn}>
                <Text style={[styles.strengthTitle, { color: colors.cricket.blue, fontSize: getResponsiveFontSize(16) }]}>
                  {video2Name}
                </Text>
                {comparison.strengths.video2.map((strength, index) => (
                  <View key={index} style={styles.strengthItem}>
                    <Text style={[styles.strengthBullet, { color: colors.cricket.blue }]}>✓</Text>
                    <Text style={[styles.strengthText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(13) }]}>
                      {language === 'hi' && translated.strengths?.video2?.[index] ? translated.strengths.video2[index] : strength}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Improvement Areas */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              {language === 'hi' ? 'सुधार क्षेत्र' : 'Areas for Improvement'}
            </Text>
            
            <View style={styles.improvementContainer}>
              <View style={styles.improvementColumn}>
                <Text style={[styles.improvementTitle, { color: colors.cricket.green, fontSize: getResponsiveFontSize(16) }]}>
                  {video1Name}
                </Text>
                {comparison.improvement_areas.video1.map((area, index) => (
                  <View key={index} style={styles.improvementItem}>
                    <Text style={[styles.improvementBullet, { color: colors.cricket.orange }]}>→</Text>
                    <Text style={[styles.improvementText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(13) }]}>
                      {language === 'hi' && translated.improvement_areas?.video1?.[index] ? translated.improvement_areas.video1[index] : area}
                    </Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.improvementColumn}>
                <Text style={[styles.improvementTitle, { color: colors.cricket.blue, fontSize: getResponsiveFontSize(16) }]}>
                  {video2Name}
                </Text>
                {comparison.improvement_areas.video2.map((area, index) => (
                  <View key={index} style={styles.improvementItem}>
                    <Text style={[styles.improvementBullet, { color: colors.cricket.orange }]}>→</Text>
                    <Text style={[styles.improvementText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(13) }]}>
                      {language === 'hi' && translated.improvement_areas?.video2?.[index] ? translated.improvement_areas.video2[index] : area}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: getResponsiveSize(spacing.lg),
    paddingTop: getResponsiveSize(spacing.xl + 20),
    ...shadows.sm,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.xs),
  },
  subtitle: {
    marginTop: getResponsiveSize(spacing.xs),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: getResponsiveSize(spacing.lg),
  },
  card: {
    marginBottom: getResponsiveSize(spacing.lg),
    ...shadows.sm,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.md),
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: getResponsiveSize(spacing.md),
  },
  scoreItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: getResponsiveSize(spacing.sm),
  },
  scoreLabel: {
    marginBottom: getResponsiveSize(spacing.xs),
    textAlign: 'center',
  },
  scoreValue: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  progressBar: {
    height: getResponsiveSize(8),
    width: '100%',
    borderRadius: borderRadius.sm,
  },
  winnerContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.md),
  },
  winnerChip: {
    paddingHorizontal: getResponsiveSize(spacing.md),
  },
  summaryText: {
    marginTop: getResponsiveSize(spacing.sm),
    lineHeight: getResponsiveSize(20),
  },
  metricItem: {
    marginBottom: getResponsiveSize(spacing.lg),
    paddingBottom: getResponsiveSize(spacing.md),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  metricName: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  metricValues: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  metricValueItem: {
    flex: 1,
  },
  metricValueLabel: {
    marginBottom: getResponsiveSize(spacing.xs),
  },
  metricValue: {
    fontWeight: '500',
  },
  metricAnalysis: {
    marginTop: getResponsiveSize(spacing.sm),
  },
  performanceChip: {
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(spacing.xs),
  },
  improvementContainer: {
    marginTop: getResponsiveSize(spacing.md),
    marginBottom: getResponsiveSize(spacing.md),
    paddingVertical: getResponsiveSize(spacing.md),
    paddingHorizontal: getResponsiveSize(spacing.md),
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  improvementPercentageContainer: {
    marginTop: getResponsiveSize(spacing.md),
    marginBottom: getResponsiveSize(spacing.md),
    paddingVertical: getResponsiveSize(spacing.md),
    paddingHorizontal: getResponsiveSize(spacing.md),
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  improvementLabel: {
    marginBottom: getResponsiveSize(spacing.sm),
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: getResponsiveSize(spacing.xs),
  },
  improvementValueWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: getResponsiveSize(spacing.sm),
    paddingHorizontal: getResponsiveSize(spacing.md),
  },
  improvementValue: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  improvementSummary: {
    marginTop: getResponsiveSize(spacing.sm),
    textAlign: 'center',
    lineHeight: getResponsiveSize(20),
  },
  improvementsList: {
    marginTop: getResponsiveSize(spacing.md),
  },
  improvementsTitle: {
    marginBottom: getResponsiveSize(spacing.sm),
  },
  improvementItem: {
    flexDirection: 'row',
    marginBottom: getResponsiveSize(spacing.xs),
    alignItems: 'flex-start',
  },
  improvementBullet: {
    fontSize: getResponsiveFontSize(16),
    marginRight: getResponsiveSize(spacing.xs),
    marginTop: getResponsiveSize(2),
  },
  improvementText: {
    flex: 1,
    lineHeight: getResponsiveSize(18),
  },
  improvementChip: {
    alignSelf: 'flex-start',
    marginBottom: getResponsiveSize(spacing.xs),
  },
  metricAnalysisText: {
    lineHeight: getResponsiveSize(18),
  },
  insightItem: {
    flexDirection: 'row',
    marginBottom: getResponsiveSize(spacing.sm),
    alignItems: 'flex-start',
  },
  insightBullet: {
    fontSize: getResponsiveFontSize(20),
    marginRight: getResponsiveSize(spacing.sm),
    marginTop: getResponsiveSize(2),
  },
  insightText: {
    flex: 1,
    lineHeight: getResponsiveSize(20),
  },
  strengthsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  strengthColumn: {
    flex: 1,
    marginHorizontal: getResponsiveSize(spacing.xs),
  },
  strengthTitle: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  strengthItem: {
    flexDirection: 'row',
    marginBottom: getResponsiveSize(spacing.xs),
    alignItems: 'flex-start',
  },
  strengthBullet: {
    fontSize: getResponsiveFontSize(16),
    marginRight: getResponsiveSize(spacing.xs),
    marginTop: getResponsiveSize(2),
  },
  strengthText: {
    flex: 1,
    lineHeight: getResponsiveSize(18),
  },
  improvementContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  improvementColumn: {
    flex: 1,
    marginHorizontal: getResponsiveSize(spacing.xs),
  },
  improvementTitle: {
    fontWeight: '600',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  improvementItem: {
    flexDirection: 'row',
    marginBottom: getResponsiveSize(spacing.xs),
    alignItems: 'flex-start',
  },
  improvementBullet: {
    fontSize: getResponsiveFontSize(16),
    marginRight: getResponsiveSize(spacing.xs),
    marginTop: getResponsiveSize(2),
  },
  improvementText: {
    flex: 1,
    lineHeight: getResponsiveSize(18),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(spacing.xl),
  },
  errorText: {
    textAlign: 'center',
    marginTop: getResponsiveSize(spacing.xl),
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
  },
  errorSubtext: {
    textAlign: 'center',
    marginTop: getResponsiveSize(spacing.md),
    fontSize: getResponsiveFontSize(14),
  },
  debugText: {
    textAlign: 'center',
    marginTop: getResponsiveSize(spacing.md),
    fontSize: getResponsiveFontSize(10),
    fontFamily: 'monospace',
  },
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    // Avoid pulling the bar into/under the top header.
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  languageToggle: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  langButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langButtonActive: {},
  langButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  speakButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

