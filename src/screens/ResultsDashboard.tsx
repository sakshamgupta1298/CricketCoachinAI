import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BorderRadius, Colors, Spacing, Typography } from '../design/DesignSystem';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type ResultsDashboardNavigationProp = StackNavigationProp<RootStackParamList, 'Results'>;
type ResultsDashboardRouteProp = RouteProp<RootStackParamList, 'Results'>;

export const ResultsDashboard: React.FC = () => {
  const navigation = useNavigation<ResultsDashboardNavigationProp>();
  const route = useRoute<ResultsDashboardRouteProp>();

  // Mock data - replace with actual results
  const mockResults = {
    overallScore: 78,
    biomechanics: [
      { name: 'Stance & Balance', score: 85, status: 'good' },
      { name: 'Head Position', score: 72, status: 'needs_improvement' },
      { name: 'Foot Movement', score: 80, status: 'good' },
      { name: 'Shot Selection', score: 65, status: 'needs_improvement' },
    ],
    injuryRisks: [
      { risk: 'Lower Back Strain', level: 'medium', description: 'Slight forward lean detected' },
      { risk: 'Shoulder Impingement', level: 'low', description: 'Good shoulder alignment' },
    ],
    recommendations: [
      'Work on maintaining head position throughout the shot',
      'Practice foot movement drills to improve balance',
      'Focus on shot selection based on ball length',
      'Include core strengthening exercises in training',
    ],
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return Colors.success;
    if (score >= 60) return Colors.warning;
    return Colors.error;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return 'checkmark-circle';
      case 'needs_improvement':
        return 'alert-circle';
      case 'poor':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return Colors.success;
      case 'needs_improvement':
        return Colors.warning;
      case 'poor':
        return Colors.error;
      default:
        return Colors.neutral[500];
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return Colors.error;
      case 'medium':
        return Colors.warning;
      case 'low':
        return Colors.success;
      default:
        return Colors.neutral[500];
    }
  };

  const handleBack = () => {
    navigation.navigate('Home');
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share results');
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Save results');
  };

  return (
    <LinearGradient
      colors={[Colors.background.light, Colors.background.lightSecondary]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Analysis Results</Text>
            <Text style={styles.subtitle}>Your cricket technique breakdown</Text>
          </View>
          <View style={styles.headerActions}>
            <Button
              title=""
              onPress={handleShare}
              variant="ghost"
              size="sm"
              icon={<Ionicons name="share-outline" size={20} color={Colors.primary[500]} />}
              style={styles.actionButton}
            />
            <Button
              title=""
              onPress={handleSave}
              variant="ghost"
              size="sm"
              icon={<Ionicons name="bookmark-outline" size={20} color={Colors.primary[500]} />}
              style={styles.actionButton}
            />
          </View>
        </View>

        {/* Overall Score Card */}
        <Card variant="elevated" style={styles.overallCard}>
          <LinearGradient
            colors={[Colors.primary[500], Colors.primary[600]]}
            style={styles.overallGradient}
          >
            <View style={styles.overallContent}>
              <Text style={styles.overallTitle}>Overall Score</Text>
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreText}>{mockResults.overallScore}</Text>
                <Text style={styles.scoreLabel}>/ 100</Text>
              </View>
              <Text style={styles.overallDescription}>
                {mockResults.overallScore >= 80 ? 'Excellent technique!' : 
                 mockResults.overallScore >= 60 ? 'Good foundation with room for improvement' : 
                 'Focus on fundamentals to improve your game'}
              </Text>
            </View>
          </LinearGradient>
        </Card>

        {/* Biomechanics Analysis */}
        <Card variant="default" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Biomechanics Analysis</Text>
          <Text style={styles.sectionDescription}>
            Detailed breakdown of your technique components
          </Text>
          
          <View style={styles.biomechanicsList}>
            {mockResults.biomechanics.map((item, index) => (
              <View key={index} style={styles.biomechanicsItem}>
                <View style={styles.biomechanicsHeader}>
                  <View style={styles.biomechanicsInfo}>
                    <Text style={styles.biomechanicsName}>{item.name}</Text>
                    <View style={styles.scoreBar}>
                      <View 
                        style={[
                          styles.scoreBarFill, 
                          { 
                            width: `${item.score}%`,
                            backgroundColor: getScoreColor(item.score)
                          }
                        ]} 
                      />
                    </View>
                  </View>
                  <View style={styles.biomechanicsScore}>
                    <Text style={[styles.scoreValue, { color: getScoreColor(item.score) }]}>
                      {item.score}
                    </Text>
                    <Ionicons 
                      name={getStatusIcon(item.status) as any} 
                      size={20} 
                      color={getStatusColor(item.status)} 
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* Injury Risk Assessment */}
        <Card variant="default" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Injury Risk Assessment</Text>
          <Text style={styles.sectionDescription}>
            Potential injury risks identified in your technique
          </Text>
          
          <View style={styles.risksList}>
            {mockResults.injuryRisks.map((risk, index) => (
              <View key={index} style={styles.riskItem}>
                <View style={styles.riskHeader}>
                  <View style={[styles.riskLevel, { backgroundColor: getRiskColor(risk.level) }]}>
                    <Text style={styles.riskLevelText}>{risk.level.toUpperCase()}</Text>
                  </View>
                  <Text style={styles.riskName}>{risk.risk}</Text>
                </View>
                <Text style={styles.riskDescription}>{risk.description}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Coaching Recommendations */}
        <Card variant="default" style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Coaching Recommendations</Text>
          <Text style={styles.sectionDescription}>
            Personalized tips to improve your technique
          </Text>
          
          <View style={styles.recommendationsList}>
            {mockResults.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={styles.recommendationIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title="View Detailed Report"
            onPress={() => {}}
            variant="primary"
            size="lg"
            style={styles.actionButton}
          />
          <Button
            title="Start New Analysis"
            onPress={handleBack}
            variant="outline"
            size="lg"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    minWidth: 40,
  },
  overallCard: {
    margin: Spacing.lg,
    overflow: 'hidden',
  },
  overallGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  overallContent: {
    alignItems: 'center',
  },
  overallTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.inverse,
    marginBottom: Spacing.md,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  scoreText: {
    fontSize: Typography.fontSize['5xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  scoreLabel: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.inverse,
    opacity: 0.8,
    marginLeft: Spacing.xs,
  },
  overallDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.inverse,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  sectionCard: {
    margin: Spacing.lg,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  sectionDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  biomechanicsList: {
    gap: Spacing.md,
  },
  biomechanicsItem: {
    paddingVertical: Spacing.sm,
  },
  biomechanicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  biomechanicsInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  biomechanicsName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  scoreBar: {
    height: 6,
    backgroundColor: Colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  biomechanicsScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  scoreValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  risksList: {
    gap: Spacing.md,
  },
  riskItem: {
    padding: Spacing.md,
    backgroundColor: Colors.background.lightSecondary,
    borderRadius: BorderRadius.lg,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  riskLevel: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  riskLevelText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  riskName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  riskDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  recommendationsList: {
    gap: Spacing.md,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  recommendationText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
    flex: 1,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
