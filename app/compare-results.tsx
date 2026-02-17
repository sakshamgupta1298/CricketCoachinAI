import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, ProgressBar, Surface, Text, useTheme } from 'react-native-paper';
import { borderRadius, colors, shadows, spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

interface ComparisonResult {
  overall_comparison: {
    video1_score: number;
    video2_score: number;
    winner: 'video1' | 'video2' | 'tie';
    overall_summary: string;
  };
  metric_comparisons: Array<{
    metric_name: string;
    video1_value: string;
    video2_value: string;
    difference_percentage: number;
    better_performance: 'video1' | 'video2' | 'similar';
    analysis: string;
  }>;
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
  
  let comparison: ComparisonResult | null = null;
  try {
    comparison = params.comparison ? JSON.parse(params.comparison as string) : null;
  } catch (error) {
    console.error('Error parsing comparison data:', error);
  }

  if (!comparison) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          No comparison data available
        </Text>
      </View>
    );
  }

  const video1Name = params.video1 as string || comparison.video1_filename || 'Video 1';
  const video2Name = params.video2 as string || comparison.video2_filename || 'Video 2';

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
          Comparison Results
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
          {video1Name} vs {video2Name}
        </Text>
      </Surface>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Comparison */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              Overall Performance
            </Text>
            
            <View style={styles.scoreContainer}>
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                  {video1Name}
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
                  {video2Name}
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

            <View style={styles.winnerContainer}>
              <Chip
                mode="flat"
                style={[styles.winnerChip, { backgroundColor: getWinnerColor(comparison.overall_comparison.winner) }]}
                textStyle={{ color: 'white', fontWeight: 'bold' }}
              >
                {comparison.overall_comparison.winner === 'video1' 
                  ? `${video1Name} performs better`
                  : comparison.overall_comparison.winner === 'video2'
                  ? `${video2Name} performs better`
                  : 'Similar Performance'}
              </Chip>
            </View>

            <Text style={[styles.summaryText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
              {comparison.overall_comparison.overall_summary}
            </Text>
          </Card.Content>
        </Card>

        {/* Metric Comparisons */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              Metric Comparisons
            </Text>
            
            {comparison.metric_comparisons.map((metric, index) => (
              <View key={index} style={styles.metricItem}>
                <Text style={[styles.metricName, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
                  {metric.metric_name}
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
                  <Chip
                    mode="outlined"
                    style={[styles.performanceChip, { borderColor: getPerformanceColor(metric.better_performance) }]}
                    textStyle={{ color: getPerformanceColor(metric.better_performance), fontSize: getResponsiveFontSize(12) }}
                  >
                    Difference: {Math.abs(metric.difference_percentage).toFixed(1)}%
                  </Chip>
                  <Text style={[styles.metricAnalysisText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
                    {metric.analysis}
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
                Key Insights
              </Text>
              {comparison.key_insights.map((insight, index) => (
                <View key={index} style={styles.insightItem}>
                  <Text style={[styles.insightBullet, { color: theme.colors.primary }]}>•</Text>
                  <Text style={[styles.insightText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                    {insight}
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
              Strengths
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
                      {strength}
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
                      {strength}
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
              Areas for Improvement
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
                      {area}
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
                      {area}
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
  errorText: {
    textAlign: 'center',
    marginTop: getResponsiveSize(spacing.xl),
    fontSize: getResponsiveFontSize(16),
  },
});

