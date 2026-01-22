import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Divider, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../src/services/api';
import { borderRadius, colors, shadows, spacing } from '../src/theme';
import { TrainingPlan } from '../src/types';
import { getResponsiveSize, getResponsiveFontSize } from '../src/utils/responsive';

export default function TrainingPlanScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ filename: string | string[]; days: string | string[] }>();
  
  // Normalize params - handle arrays from expo-router
  const filename = Array.isArray(params.filename) ? params.filename[0] : params.filename;
  const days = Array.isArray(params.days) ? params.days[0] : (params.days || '7');
  
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [hasCheckedExisting, setHasCheckedExisting] = useState(false);

  const validateTrainingPlan = (data: any): data is TrainingPlan => {
    return (
      data &&
      typeof data === 'object' &&
      Array.isArray(data.plan) &&
      data.plan.length > 0 &&
      data.plan.every((day: any) => 
        day &&
        typeof day.day === 'number' &&
        typeof day.focus === 'string' &&
        Array.isArray(day.warmup) &&
        Array.isArray(day.drills) &&
        typeof day.progression === 'string'
      )
    );
  };

  const loadTrainingPlan = useCallback(async () => {
    if (!filename || typeof filename !== 'string') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Invalid filename parameter',
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiService.getTrainingPlan(filename);
      if (response.success && response.data) {
        // Validate the training plan structure before setting it
        if (validateTrainingPlan(response.data)) {
          setTrainingPlan(response.data);
          setSelectedDay(1); // Select first day by default
        } else {
          console.error('Invalid training plan structure:', response.data);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Invalid training plan data received',
          });
          setTrainingPlan(null);
        }
      } else {
        // Plan doesn't exist, show generate option (this is normal)
        setTrainingPlan(null);
      }
    } catch (error: any) {
      console.error('Error loading training plan:', error);
      // Only show error for actual errors, not for missing plans
      if (error.response?.status !== 404) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load training plan',
        });
      }
      setTrainingPlan(null);
    } finally {
      setLoading(false);
    }
  }, [filename]);

  useEffect(() => {
    // Automatically check for existing plan when component mounts
    if (filename && typeof filename === 'string' && !hasCheckedExisting) {
      setHasCheckedExisting(true);
      loadTrainingPlan();
    }
  }, [filename, hasCheckedExisting, loadTrainingPlan]);

  const generateTrainingPlan = async () => {
    if (!filename || typeof filename !== 'string') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Invalid filename parameter',
      });
      return;
    }
    
    setGenerating(true);
    try {
      const daysNum = parseInt(days, 10);
      if (isNaN(daysNum) || daysNum < 1) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Invalid number of days',
        });
        setGenerating(false);
        return;
      }

      const response = await apiService.generateTrainingPlan(filename, daysNum);
      if (response.success && response.data) {
        // Validate the training plan structure before setting it
        if (validateTrainingPlan(response.data)) {
          setTrainingPlan(response.data);
          setSelectedDay(1);
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: 'Training plan generated successfully!',
          });
        } else {
          console.error('Invalid training plan structure:', response.data);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Invalid training plan data received',
          });
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error || 'Failed to generate training plan',
        });
      }
    } catch (error) {
      console.error('Error generating training plan:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to generate training plan',
      });
    } finally {
      setGenerating(false);
    }
  };

  const renderDayCard = (day: any, index: number) => {
    if (!day || typeof day.day !== 'number') return null;
    
    const isSelected = selectedDay === day.day;
    
    return (
      <TouchableOpacity
        key={day.day || index}
        style={[
          styles.dayCard,
          { backgroundColor: theme.colors.surface },
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 }
        ]}
        onPress={() => setSelectedDay(day.day)}
        activeOpacity={0.7}
      >
        <View style={styles.dayHeader}>
          <View style={[styles.dayNumber, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.dayNumberText}>{day.day}</Text>
          </View>
          <View style={styles.dayInfo}>
            <Text style={[styles.dayFocus, { color: theme.colors.onSurface }]}>
              {day.focus || 'Training Day'}
            </Text>
            <Text style={[styles.dayDuration, { color: theme.colors.onSurfaceVariant }]}>
              ~45-60 min session
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedDay = () => {
    if (!trainingPlan || !selectedDay || !Array.isArray(trainingPlan.plan)) return null;
    
    const day = trainingPlan.plan.find(d => d.day === selectedDay);
    if (!day) return null;

    return (
      <Surface style={[styles.selectedDayCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.selectedDayHeader}>
          <Text style={[styles.selectedDayTitle, { color: theme.colors.onSurface }]}>
            Day {day.day}: {day.focus}
          </Text>
          <Chip mode="outlined" textStyle={{ color: theme.colors.primary }}>
            {day.day === 1 ? 'Start Here' : 'Continue'}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        {/* Warmup Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔥</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Warmup (10-15 min)
            </Text>
          </View>
          {Array.isArray(day.warmup) && day.warmup.map((exercise, index) => (
            <View key={index} style={styles.exerciseItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={[styles.exerciseText, { color: theme.colors.onSurfaceVariant }]}>
                {exercise}
              </Text>
            </View>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Drills Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🎯</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Main Drills (25-35 min)
            </Text>
          </View>
          {Array.isArray(day.drills) && day.drills.map((drill, index) => (
            <Card key={index} style={styles.drillCard} mode="outlined">
              <Card.Content>
                <View style={styles.drillHeader}>
                  <Text style={[styles.drillName, { color: theme.colors.onSurface }]}>
                    {drill?.name || 'Drill'}
                  </Text>
                  <Chip mode="outlined" compact>
                    {drill?.reps || 'N/A'}
                  </Chip>
                </View>
                {drill?.notes && (
                  <Text style={[styles.drillNotes, { color: theme.colors.onSurfaceVariant }]}>
                    💡 {drill.notes}
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Progression & Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📈</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Progression
            </Text>
          </View>
          <Text style={[styles.progressionText, { color: theme.colors.onSurfaceVariant }]}>
            {day.progression}
          </Text>
        </View>

        {day.notes && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>💭</Text>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Coach's Notes
                </Text>
              </View>
              <Text style={[styles.notesText, { color: theme.colors.onSurfaceVariant }]}>
                {day.notes}
              </Text>
            </View>
          </>
        )}
      </Surface>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            Loading training plan...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            Training Plan
          </Text>
          <View style={{ width: 48 }} />
        </View>
      </Surface>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {!trainingPlan ? (
          // Generate Plan View
          <View style={styles.generateContainer}>
            <Surface style={[styles.generateCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles.generateIcon}>🏋️‍♂️</Text>
              <Text style={[styles.generateTitle, { color: theme.colors.onSurface }]}>
                Generate Training Plan
              </Text>
              <Text style={[styles.generateDescription, { color: theme.colors.onSurfaceVariant }]}>
                Create a personalized {days}-day training plan based on your analysis results
              </Text>
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={generateTrainingPlan}
                  loading={generating}
                  disabled={generating}
                  style={styles.generateButton}
                  contentStyle={styles.generateButtonContent}
                >
                  {generating ? 'Generating...' : 'Generate Plan'}
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={loadTrainingPlan}
                  loading={loading}
                  disabled={loading}
                  style={styles.checkButton}
                  contentStyle={styles.checkButtonContent}
                >
                  {loading ? 'Checking...' : 'Check Existing Plan'}
                </Button>
              </View>
            </Surface>
          </View>
        ) : (
          // Training Plan View
          <>
            {/* Overall Notes */}
            {trainingPlan.overall_notes && (
              <Surface style={[styles.overallNotesCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.overallNotesHeader}>
                  <Text style={styles.overallNotesIcon}>📋</Text>
                  <Text style={[styles.overallNotesTitle, { color: theme.colors.onSurface }]}>
                    Weekly Overview
                  </Text>
                </View>
                <Text style={[styles.overallNotesText, { color: theme.colors.onSurfaceVariant }]}>
                  {trainingPlan.overall_notes}
                </Text>
              </Surface>
            )}

            {/* Day Selection */}
            <View style={styles.daysContainer}>
              <Text style={[styles.daysTitle, { color: theme.colors.onBackground }]}>
                Training Days
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysScroll}>
                {Array.isArray(trainingPlan.plan) && trainingPlan.plan.map((day, index) => renderDayCard(day, index))}
              </ScrollView>
            </View>

            {/* Selected Day Details */}
            {renderSelectedDay()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
  },
  generateContainer: {
    padding: spacing.lg,
    flex: 1,
    justifyContent: 'center',
  },
  generateCard: {
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  generateIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  generateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  generateDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  generateButton: {
    borderRadius: borderRadius.lg,
    minWidth: 200,
  },
  generateButtonContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  overallNotesCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  overallNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  overallNotesIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  overallNotesTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  overallNotesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  daysContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  daysTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  daysScroll: {
    flexDirection: 'row',
  },
  dayCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginRight: spacing.sm,
    minWidth: 120,
    ...shadows.sm,
  },
  dayHeader: {
    alignItems: 'center',
  },
  dayNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayInfo: {
    alignItems: 'center',
  },
  dayFocus: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dayDuration: {
    fontSize: 10,
    textAlign: 'center',
  },
  selectedDayCard: {
    margin: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  selectedDayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  divider: {
    marginHorizontal: spacing.lg,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: spacing.sm,
    marginTop: 2,
    color: colors.cricket.green,
  },
  exerciseText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  drillCard: {
    marginBottom: spacing.sm,
  },
  drillHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  drillName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  drillNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  progressionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: spacing.md,
    width: '100%',
  },
  checkButton: {
    borderRadius: borderRadius.lg,
    minWidth: 200,
  },
  checkButtonContent: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
}); 