import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    Card,
    Chip,
    IconButton,
    Surface,
    Text,
    useTheme
} from 'react-native-paper';
import { borderRadius, colors, shadows, spacing } from '../theme';
import { AnalysisResult } from '../types';

type RootStackParamList = {
  Main: undefined;
  Results: { result: AnalysisResult };
};

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;
type ResultsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;

const ResultsScreen: React.FC = () => {
  const theme = useTheme();
  const route = useRoute<ResultsScreenRouteProp>();
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const { result } = route.params;
  const [isBiomechanicsExpanded, setIsBiomechanicsExpanded] = React.useState(false);

  const getPlayerTypeIcon = (type: string) => {
    return type === 'batsman' ? '🏏' : '🎯';
  };

  const getShotTypeColor = (shotType: string) => {
    const colors = {
      coverdrive: colors.cricket.green,
      pull_shot: colors.cricket.blue,
      default: colors.cricket.orange,
    };
    return colors[shotType as keyof typeof colors] || colors.default;
  };

  const renderFlaws = () => {
    // Support both old format (flaws) and new format (technical_flaws)
    const flaws = result.gpt_feedback.technical_flaws || result.gpt_feedback.flaws || [];
    
    if (flaws.length === 0) {
      return (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              🎉 Great Technique!
            </Text>
            <Text style={[styles.cardDescription, { color: theme.colors.onSurfaceVariant }]}>
              No major flaws detected in your technique. Keep up the good work!
            </Text>
          </Card.Content>
        </Card>
      );
    }

    return flaws.map((flaw: any, index: number) => {
      // Handle both old and new format
      const isNewFormat = 'deviation' in flaw;
      const featureName = flaw.feature.replace(/_/g, ' ').toUpperCase();
      const deviationText = isNewFormat 
        ? flaw.deviation 
        : `${flaw.observed} vs ${flaw.expected_range}`;

      return (
        <Card key={index} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.flawHeader}>
              <Text style={[styles.flawTitle, { color: theme.colors.onSurface }]}>
                {featureName}
              </Text>
              <Chip
                mode="outlined"
                textStyle={{ color: colors.error }}
                style={{ borderColor: colors.error }}
              >
                {deviationText}
              </Chip>
            </View>
            
            <Text style={[styles.flawIssue, { color: theme.colors.onSurface }]}>
              {flaw.issue}
            </Text>
            
            <View style={styles.recommendationContainer}>
              <Text style={[styles.recommendationLabel, { color: theme.colors.primary }]}>
                💡 Recommendation:
              </Text>
              <Text style={[styles.recommendationText, { color: theme.colors.onSurface }]}>
                {flaw.recommendation}
              </Text>
            </View>
          </Card.Content>
        </Card>
      );
    });
  };

  const renderGeneralTips = () => {
    if (!result.gpt_feedback.general_tips || result.gpt_feedback.general_tips.length === 0) {
      return null;
    }

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            💪 General Tips
          </Text>
          {result.gpt_feedback.general_tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={styles.tipBullet}>•</Text>
              <Text style={[styles.tipText, { color: theme.colors.onSurface }]}>
                {tip}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderInjuryRisks = () => {
    // Support both old format (injury_risks as string[]) and new format (injury_risk_assessment as objects)
    const oldRisks = result.gpt_feedback.injury_risks || [];
    const newRisks = result.gpt_feedback.injury_risk_assessment || [];
    
    if (oldRisks.length === 0 && newRisks.length === 0) {
      return null;
    }

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.cardTitle, { color: colors.error }]}>
            ⚠️ Injury Risks
          </Text>
          {/* Render old format (strings) */}
          {oldRisks.map((risk: string, index: number) => (
            <View key={`old-${index}`} style={styles.riskItem}>
              <Text style={styles.riskBullet}>⚠️</Text>
              <Text style={[styles.riskText, { color: theme.colors.onSurface }]}>
                {risk}
              </Text>
            </View>
          ))}
          {/* Render new format (objects) */}
          {newRisks.map((risk: any, index: number) => (
            <View key={`new-${index}`} style={styles.riskItem}>
              <Text style={styles.riskBullet}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.riskText, { color: theme.colors.onSurface, fontWeight: '600' }]}>
                  {risk.body_part} - {risk.risk_level}
                </Text>
                <Text style={[styles.riskText, { color: theme.colors.onSurfaceVariant, fontSize: 14, marginTop: 4 }]}>
                  {risk.reason}
                </Text>
              </View>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerContent}>
            <Text style={styles.playerTypeIcon}>
              {getPlayerTypeIcon(result.player_type)}
            </Text>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {result.player_type === 'batsman' ? 'Batting' : 'Bowling'} Analysis
              </Text>
              {result.shot_type && (
                <Chip
                  mode="contained"
                  style={[styles.shotChip, { backgroundColor: getShotTypeColor(result.shot_type) }]}
                  textStyle={{ color: 'white' }}
                >
                  {result.shot_type.replace(/_/g, ' ').toUpperCase()}
                </Chip>
              )}
            </View>
          </View>
          
          <View style={styles.playerInfo}>
            <Text style={[styles.playerInfoText, { color: theme.colors.onSurfaceVariant }]}>
              {result.player_type === 'batsman' ? 'Batting' : 'Bowling'} Side: {result.batter_side || result.bowler_side}
            </Text>
            <Text style={[styles.playerInfoText, { color: theme.colors.onSurfaceVariant }]}>
              File: {result.filename}
            </Text>
          </View>
        </Surface>

        {/* Analysis Summary - Support both old (analysis) and new (analysis_summary) format */}
        {(result.gpt_feedback.analysis_summary || result.gpt_feedback.analysis) && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                📊 Analysis Summary
              </Text>
              <Text style={[styles.analysisText, { color: theme.colors.onSurface }]}>
                {result.gpt_feedback.analysis_summary || result.gpt_feedback.analysis}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Flaws - Moved above Biomechanical Features */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Areas for Improvement
          </Text>
          {renderFlaws()}
        </View>

        {/* Biomechanical Features - Support both old and new format with collapsible dropdown */}
        {(result.gpt_feedback.biomechanics || result.gpt_feedback.biomechanical_features) && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <TouchableOpacity
                style={styles.biomechanicsHeader}
                onPress={() => setIsBiomechanicsExpanded(!isBiomechanicsExpanded)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  🔬 Biomechanical Features
                </Text>
                <IconButton
                  icon={isBiomechanicsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  iconColor={theme.colors.onSurface}
                  style={{ margin: 0 }}
                />
              </TouchableOpacity>
              
              {isBiomechanicsExpanded && (
                <>
                  {/* New format: biomechanics with core/conditional/inferred */}
                  {result.gpt_feedback.biomechanics && (
                    <>
                      {result.gpt_feedback.biomechanics.core && Object.entries(result.gpt_feedback.biomechanics.core).map(([key, value]: [string, any], index) => (
                        <View key={`core-${index}`} style={styles.biomechanicalItem}>
                          <View style={styles.biomechanicalHeader}>
                            <Text style={[styles.biomechanicalLabel, { color: theme.colors.onSurface }]}>
                              {key.replace(/_/g, ' ')}
                            </Text>
                            <Chip mode="flat" textStyle={{ fontSize: 10 }} style={{ backgroundColor: colors.cricket.green + '20' }}>
                              CORE
                            </Chip>
                          </View>
                          <View style={styles.biomechanicalValue}>
                            <Text style={[styles.biomechanicalObserved, { color: theme.colors.primary }]}>
                              Observed: {value.observed}
                            </Text>
                            {value.ideal_range && (
                              <Text style={[styles.biomechanicalExpected, { color: theme.colors.onSurfaceVariant }]}>
                                Ideal: {value.ideal_range}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.biomechanicalAnalysis, { color: theme.colors.onSurfaceVariant }]}>
                            {value.analysis}
                          </Text>
                        </View>
                      ))}
                      
                      {result.gpt_feedback.biomechanics.conditional && Object.entries(result.gpt_feedback.biomechanics.conditional).map(([key, value]: [string, any], index) => (
                        <View key={`conditional-${index}`} style={styles.biomechanicalItem}>
                          <View style={styles.biomechanicalHeader}>
                            <Text style={[styles.biomechanicalLabel, { color: theme.colors.onSurface }]}>
                              {key.replace(/_/g, ' ')}
                            </Text>
                            <Chip mode="flat" textStyle={{ fontSize: 10 }} style={{ backgroundColor: colors.cricket.blue + '20' }}>
                              CONDITIONAL
                            </Chip>
                          </View>
                          <View style={styles.biomechanicalValue}>
                            <Text style={[styles.biomechanicalObserved, { color: theme.colors.primary }]}>
                              Observed: {value.observed}
                            </Text>
                            {value.ideal_range && (
                              <Text style={[styles.biomechanicalExpected, { color: theme.colors.onSurfaceVariant }]}>
                                Ideal: {value.ideal_range}
                              </Text>
                            )}
                          </View>
                          {value.confidence && (
                            <Text style={[styles.biomechanicalConfidence, { color: theme.colors.onSurfaceVariant }]}>
                              Confidence: {value.confidence}
                            </Text>
                          )}
                          <Text style={[styles.biomechanicalAnalysis, { color: theme.colors.onSurfaceVariant }]}>
                            {value.analysis}
                          </Text>
                        </View>
                      ))}
                      
                      {result.gpt_feedback.biomechanics.inferred && Object.entries(result.gpt_feedback.biomechanics.inferred).map(([key, value]: [string, any], index) => (
                        <View key={`inferred-${index}`} style={styles.biomechanicalItem}>
                          <View style={styles.biomechanicalHeader}>
                            <Text style={[styles.biomechanicalLabel, { color: theme.colors.onSurface }]}>
                              {key.replace(/_/g, ' ')}
                            </Text>
                            <Chip mode="flat" textStyle={{ fontSize: 10 }} style={{ backgroundColor: colors.cricket.orange + '20' }}>
                              INFERRED
                            </Chip>
                          </View>
                          <View style={styles.biomechanicalValue}>
                            <Text style={[styles.biomechanicalObserved, { color: theme.colors.primary }]}>
                              {typeof value.observed === 'string' ? value.observed : `Observed: ${value.observed}`}
                            </Text>
                            {value.ideal_range && (
                              <Text style={[styles.biomechanicalExpected, { color: theme.colors.onSurfaceVariant }]}>
                                Ideal: {value.ideal_range}
                              </Text>
                            )}
                          </View>
                          {value.estimated && (
                            <Text style={[styles.biomechanicalConfidence, { color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }]}>
                              Estimated value
                            </Text>
                          )}
                          <Text style={[styles.biomechanicalAnalysis, { color: theme.colors.onSurfaceVariant }]}>
                            {value.analysis}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                  
                  {/* Old format: biomechanical_features as flat object */}
                  {result.gpt_feedback.biomechanical_features && !result.gpt_feedback.biomechanics && 
                    Object.entries(result.gpt_feedback.biomechanical_features).map(([key, value]: [string, any], index) => (
                      <View key={`old-${index}`} style={styles.biomechanicalItem}>
                        <Text style={[styles.biomechanicalLabel, { color: theme.colors.onSurface }]}>
                          {key.replace(/_/g, ' ').toUpperCase()}
                        </Text>
                        <View style={styles.biomechanicalValue}>
                          <Text style={[styles.biomechanicalObserved, { color: theme.colors.primary }]}>
                            Observed: {value.observed}
                          </Text>
                          <Text style={[styles.biomechanicalExpected, { color: theme.colors.onSurfaceVariant }]}>
                            Expected: {value.expected_range}
                          </Text>
                        </View>
                        <Text style={[styles.biomechanicalAnalysis, { color: theme.colors.onSurfaceVariant }]}>
                          {value.analysis}
                        </Text>
                      </View>
                    ))
                  }
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Injury Risks */}
        {renderInjuryRisks()}

        {/* General Tips */}
        {renderGeneralTips()}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('Upload' as any)}
          >
            <Text style={styles.actionButtonText}>New Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            onPress={() => navigation.navigate('History' as any)}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.onSurface }]}>
              View History
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  playerTypeIcon: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  shotChip: {
    alignSelf: 'flex-start',
  },
  playerInfo: {
    gap: spacing.xs,
  },
  playerInfoText: {
    fontSize: 14,
  },
  card: {
    marginBottom: spacing.lg,
    ...shadows.small,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  cardDescription: {
    fontSize: 16,
    lineHeight: 24,
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
  },
  biomechanicalItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  biomechanicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  biomechanicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  biomechanicalLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  biomechanicalConfidence: {
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  biomechanicalValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  biomechanicalObserved: {
    fontSize: 14,
    fontWeight: '500',
  },
  biomechanicalExpected: {
    fontSize: 14,
  },
  biomechanicalAnalysis: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  flawHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  flawTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  flawIssue: {
    fontSize: 16,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  recommendationContainer: {
    backgroundColor: colors.gray[50],
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  recommendationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  recommendationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tipBullet: {
    fontSize: 16,
    marginRight: spacing.sm,
    color: colors.cricket.green,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  riskBullet: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  riskText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ResultsScreen; 