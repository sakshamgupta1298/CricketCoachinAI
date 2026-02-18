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
  
  let comparison: ComparisonResult | null = null;
  try {
    if (params.comparison) {
      const parsed = JSON.parse(params.comparison as string);
      // Handle nested structure: { comparison: {...} } or direct {...}
      comparison = parsed.comparison || parsed;
    }
  } catch (error) {
    console.error('Error parsing comparison data:', error);
    console.error('Raw comparison data:', params.comparison);
  }

  if (!comparison || !comparison.overall_comparison) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(24) }]}>
            Comparison Results
          </Text>
        </Surface>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            No comparison data available
          </Text>
          <Text style={[styles.errorSubtext, { color: theme.colors.onSurfaceVariant }]}>
            {comparison ? 'Invalid comparison data structure' : 'Please try comparing again'}
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

  const video1Name = 'Previous';
  const video2Name = 'Current';

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
          Previous vs Current Performance
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
                  Previous
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
                  Current
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
            <View style={styles.improvementContainer}>
              <Text style={[styles.improvementLabel, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
                Improvement from Previous to Current:
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
                  {comparison.overall_comparison.improvement_summary}
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
                  ? 'Previous performs better'
                  : comparison.overall_comparison.winner === 'video2'
                  ? 'Current performs better'
                  : 'Similar Performance'}
              </Chip>
            </View>

            <Text style={[styles.summaryText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
              {comparison.overall_comparison.overall_summary}
            </Text>
          </Card.Content>
        </Card>

        {/* Improvement Summary */}
        {comparison.improvement_summary && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
                Improvement Summary
              </Text>
              
              {comparison.improvement_summary.overall_improvement && (
                <Text style={[styles.improvementText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(15) }]}>
                  {comparison.improvement_summary.overall_improvement}
                </Text>
              )}

              {comparison.improvement_summary.top_improvements && comparison.improvement_summary.top_improvements.length > 0 && (
                <View style={styles.improvementsList}>
                  <Text style={[styles.improvementsTitle, { color: colors.cricket.green, fontSize: getResponsiveFontSize(16), fontWeight: '600' }]}>
                    Top Improvements:
                  </Text>
                  {comparison.improvement_summary.top_improvements.map((improvement, index) => (
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
                    Areas Still Needing Work:
                  </Text>
                  {comparison.improvement_summary.areas_still_needing_work.map((area, index) => (
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
                          {metric.improvement_percentage.toFixed(1)}% Improvement
                        </>
                      ) : (
                        `Difference: ${Math.abs(metric.difference_percentage ?? 0).toFixed(1)}%`
                      )}
                    </Chip>
                  )}
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
});

