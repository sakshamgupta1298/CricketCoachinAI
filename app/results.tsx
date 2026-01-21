import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Chip, Surface, Text, useTheme } from 'react-native-paper';
import { currentConfig } from '../config';
import apiService from '../src/services/api';
import { borderRadius, colors, shadows, spacing } from '../src/theme';
import { AnalysisResult } from '../src/types';

export default function ResultsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  
  // Parse the result from params
  const result: AnalysisResult = params.result ? JSON.parse(params.result as string) : null;

  // Get auth token for video access
  useEffect(() => {
    const loadToken = async () => {
      const token = await apiService.getStoredToken();
      setAuthToken(token);
    };
    loadToken();
  }, []);

  // Debug logging
  useEffect(() => {
    if (result) {
      console.log('🎥 [RESULTS] Annotated video path:', result.annotated_video_path);
      console.log('🎥 [RESULTS] Annotated video path type:', typeof result.annotated_video_path);
      console.log('🎥 [RESULTS] Annotated video path value check:', {
        exists: !!result.annotated_video_path,
        notNone: result.annotated_video_path !== 'None',
        notEmpty: result.annotated_video_path?.trim() !== '',
        fullCheck: result.annotated_video_path && result.annotated_video_path !== 'None' && result.annotated_video_path.trim() !== ''
      });
    }
  }, [result]);

  if (!result) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          No analysis results found
        </Text>
      </View>
    );
  }

  const getPlayerTypeIcon = (type: string) => {
    return type === 'batsman' ? '🏏' : '🎯';
  };

  const getShotTypeColor = (shotType: string) => {
    const colorMap = {
      coverdrive: colors.cricket.green,
      pull_shot: colors.cricket.blue,
      default: colors.cricket.orange,
    };
    return colorMap[shotType as keyof typeof colorMap] || colorMap.default;
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
          
          {flaw.issue && (
            <Text style={[styles.flawIssue, { color: theme.colors.onSurface }]}>
              {flaw.issue}
            </Text>
          )}
          
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
                  mode="outlined"
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
            {result.bowler_type && (
              <Text style={[styles.playerInfoText, { color: theme.colors.onSurfaceVariant }]}>
                Bowler Type: {result.bowler_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            )}
          </View>
          
          {/* Video Player - Show video if available, otherwise show filename as fallback */}
          {(() => {
            const hasVideoPath = result.annotated_video_path && 
                                 result.annotated_video_path !== 'None' && 
                                 result.annotated_video_path !== null && 
                                 result.annotated_video_path !== undefined &&
                                 String(result.annotated_video_path).trim() !== '';
            
            console.log('🎥 [VIDEO CHECK] hasVideoPath:', hasVideoPath);
            console.log('🎥 [VIDEO CHECK] annotated_video_path value:', result.annotated_video_path);
            
            if (hasVideoPath) {
              // The backend returns just the filename
              const videoFilename = String(result.annotated_video_path).includes('/') 
                ? String(result.annotated_video_path).split('/').pop() 
                : String(result.annotated_video_path).includes('\\')
                ? String(result.annotated_video_path).split('\\').pop()
                : String(result.annotated_video_path);
              const videoUrl = `${currentConfig.API_BASE_URL}/api/video/${encodeURIComponent(videoFilename)}`;
              
              console.log('🎥 [VIDEO] Loading video from URL:', videoUrl);
              console.log('🎥 [VIDEO] Video filename:', videoFilename);
              
              return (
                <View style={styles.videoContainer}>
                  <Video
                    ref={videoRef}
                    source={{
                      uri: videoUrl,
                      headers: authToken ? {
                        'Authorization': `Bearer ${authToken}`,
                      } : undefined,
                    }}
                    style={styles.video}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={false}
                    onLoad={(status: AVPlaybackStatus) => {
                      console.log('✅ [VIDEO] Video loaded successfully:', status);
                    }}
                    onError={(error: string) => {
                      console.error('❌ [VIDEO] Video playback error:', error);
                    }}
                  />
                </View>
              );
            } else {
              return (
                <View style={styles.fallbackContainer}>
                  <Text style={[styles.playerInfoText, { color: theme.colors.onSurfaceVariant }]}>
                    File: {result.filename}
                  </Text>
                  <Text style={[styles.fallbackText, { color: theme.colors.onSurfaceVariant }]}>
                    {result.annotated_video_path 
                      ? `Video path received: ${result.annotated_video_path} (but condition failed)` 
                      : 'Video/analysis processing may still be in progress. If you left the app, background work can pause on mobile—please keep the app open or come back in a moment.'}
                  </Text>
                </View>
              );
            }
          })()}
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
            onPress={() => router.push('/upload')}
          >
            <Text style={styles.actionButtonText}>New Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.cricket.green }]}
            onPress={() => router.push({
              pathname: '/training-plan',
              params: { filename: result.filename, days: '7' }
            })}
          >
            <Text style={styles.actionButtonText}>Training Plan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}
            onPress={() => router.push('/history')}
          >
            <Text style={[styles.actionButtonText, { color: theme.colors.onSurface }]}>
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

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
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
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
  section: {
    marginTop: spacing.lg,
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
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  flawIssue: {
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  recommendationContainer: {
    marginTop: spacing.xs,
  },
  recommendationLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  recommendationText: {
    fontSize: 14,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  tipBullet: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  tipText: {
    fontSize: 14,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  riskBullet: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  riskText: {
    fontSize: 14,
  },
  biomechanicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  biomechanicalItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
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
    fontWeight: '600',
  },
  biomechanicalExpected: {
    fontSize: 14,
  },
  biomechanicalAnalysis: {
    fontSize: 14,
    lineHeight: 20,
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