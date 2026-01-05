import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Card,
  Chip,
  Surface,
  Text,
  useTheme
} from 'react-native-paper';
import Video from 'react-native-video';
import { currentConfig } from '../../config';
import apiService from '../services/api';
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
  const [authToken, setAuthToken] = React.useState<string | null>(null);

  // Get auth token for video access
  React.useEffect(() => {
    const loadToken = async () => {
      const token = await apiService.getStoredToken();
      setAuthToken(token);
    };
    loadToken();
  }, []);

  // Print the complete result data received from backend
  console.log('========================================');
  console.log('📊 [RESULTS_SCREEN] Complete result data received from backend:');
  console.log('========================================');
  console.log(JSON.stringify(result, null, 2));
  console.log('========================================');
  console.log('📋 [RESULTS_SCREEN] Result structure breakdown:');
  console.log('========================================');
  console.log('Player Type:', result.player_type);
  console.log('Shot Type:', result.shot_type);
  console.log('Batter Side:', result.batter_side);
  console.log('Bowler Side:', result.bowler_side);
  console.log('Filename:', result.filename);
  console.log('Annotated Video Path:', result.annotated_video_path);
  console.log('GPT Feedback:', result.gpt_feedback);
  if (result.gpt_feedback) {
    console.log('  - Analysis Summary:', result.gpt_feedback.analysis_summary || result.gpt_feedback.analysis);
    console.log('  - Technical Flaws:', result.gpt_feedback.technical_flaws || result.gpt_feedback.flaws);
    console.log('  - General Tips:', result.gpt_feedback.general_tips);
    console.log('  - Injury Risks:', result.gpt_feedback.injury_risks);
    console.log('  - Injury Risk Assessment:', result.gpt_feedback.injury_risk_assessment);
  }
  console.log('========================================');

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
      // New format has ideal_range (from confirmed_faults), old format has expected_range
      // Check if ideal_range exists and is not null/undefined, and is a non-empty string
      const idealRange = flaw.ideal_range;
      const expectedRange = flaw.expected_range;
      const deviation = flaw.deviation;
      
      const hasIdealRange = idealRange !== undefined && idealRange !== null && typeof idealRange === 'string' && idealRange.trim() !== '';
      const hasExpectedRange = expectedRange !== undefined && expectedRange !== null && typeof expectedRange === 'string' && expectedRange.trim() !== '';
      const hasDeviation = deviation !== undefined && deviation !== null && typeof deviation === 'string' && deviation.trim() !== '';
      
      const featureName = flaw.feature.replace(/_/g, ' ').toUpperCase();
      
      let deviationText = '';
      // Prioritize showing observed vs ideal_range if both are available
      if (hasIdealRange && flaw.observed !== undefined && flaw.observed !== null) {
        deviationText = `${flaw.observed} vs ${idealRange}`;
      } else if (hasExpectedRange && flaw.observed !== undefined && flaw.observed !== null) {
        deviationText = `${flaw.observed} vs ${expectedRange}`;
      } else if (hasDeviation) {
        deviationText = deviation;
      } else {
        deviationText = flaw.observed !== undefined && flaw.observed !== null ? String(flaw.observed) : 'N/A';
      }

      return (
        <Card key={index} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.flawHeader}>
              <Text style={[styles.flawTitle, { color: theme.colors.onSurface }]}>
                {featureName}
              </Text>
              {/* Deviation text below feature name */}
              <Text style={[styles.deviationText, { color: colors.error }]}>
                {deviationText}
              </Text>
            </View>
            
            <View style={styles.recommendationContainer}>
              <Text style={[styles.recommendationLabel, { color: theme.colors.primary }]}>
                💡 Recommendation:
              </Text>
              <Text style={[styles.recommendationText, { color: theme.colors.onSurface }]}>
                {flaw.recommendation}
              </Text>
            </View>
            
            {flaw.issue && (
              <Text style={[styles.flawIssue, { color: theme.colors.onSurface, marginTop: spacing.md }]}>
                {flaw.issue}
              </Text>
            )}
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
    // Prefer new format to avoid duplicates - only use old format if new format doesn't exist
    const newRisks = result.gpt_feedback.injury_risk_assessment || [];
    const oldRisks = result.gpt_feedback.injury_risks || [];
    
    // Only use oldRisks if newRisks is empty (backward compatibility)
    const hasNewFormat = newRisks.length > 0;
    const risksToRender = hasNewFormat ? newRisks : oldRisks;
    
    if (risksToRender.length === 0) {
      return null;
    }

    return (
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.cardTitle, { color: colors.error }]}>
            ⚠️ Injury Risks
          </Text>
          {/* Render new format (objects) if available, otherwise old format (strings) */}
          {hasNewFormat ? (
            newRisks.map((risk: any, index: number) => (
              <View key={`risk-${index}`} style={styles.riskItem}>
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
            ))
          ) : (
            oldRisks.map((risk: string, index: number) => (
              <View key={`risk-${index}`} style={styles.riskItem}>
                <Text style={styles.riskBullet}>⚠️</Text>
                <Text style={[styles.riskText, { color: theme.colors.onSurface }]}>
                  {risk}
                </Text>
              </View>
            ))
          )}
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
          </View>
          
          {/* Video Player - Show video if available, otherwise show filename as fallback */}
          {result.annotated_video_path && result.annotated_video_path !== 'None' && result.annotated_video_path.trim() !== '' ? (
            <View style={styles.videoContainer}>
              <Video
                source={{
                  uri: (() => {
                    // The backend now returns just the filename, but handle both cases
                    const videoFilename = result.annotated_video_path.includes('/') 
                      ? result.annotated_video_path.split('/').pop() 
                      : result.annotated_video_path.includes('\\')
                      ? result.annotated_video_path.split('\\').pop()
                      : result.annotated_video_path;
                    const videoUrl = `${currentConfig.API_BASE_URL}/api/video/${encodeURIComponent(videoFilename || result.annotated_video_path)}`;
                    console.log('🎥 [VIDEO] Loading video from URL:', videoUrl);
                    console.log('🎥 [VIDEO] Annotated video path from backend:', result.annotated_video_path);
                    console.log('🎥 [VIDEO] Extracted filename:', videoFilename);
                    return videoUrl;
                  })(),
                  headers: authToken ? {
                    'Authorization': `Bearer ${authToken}`,
                  } : undefined,
                }}
                style={styles.video}
                controls={true}
                resizeMode="contain"
                paused={false}
                onLoad={() => {
                  console.log('✅ [VIDEO] Video loaded successfully');
                }}
                onError={(error: any) => {
                  console.error('❌ [VIDEO] Video playback error:', error);
                  console.error('❌ [VIDEO] Error details:', JSON.stringify(error, null, 2));
                }}
              />
            </View>
          ) : (
            <View style={styles.fallbackContainer}>
              <Text style={[styles.playerInfoText, { color: theme.colors.onSurfaceVariant }]}>
                File: {result.filename}
              </Text>
              {!result.annotated_video_path && (
                <Text style={[styles.fallbackText, { color: theme.colors.onSurfaceVariant }]}>
                  Video processing in progress...
                </Text>
              )}
            </View>
          )}
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  flawHeader: {
    marginBottom: spacing.md,
  },
  flawTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  deviationText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: spacing.xs,
    flexWrap: 'wrap',
    flexShrink: 1,
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
  videoContainer: {
    width: '100%',
    height: Dimensions.get('window').width * 0.75, // 4:3 aspect ratio
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.gray[900],
  },
  video: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
  },
  fallbackText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
});

export default ResultsScreen; 