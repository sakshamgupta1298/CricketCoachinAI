import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Divider, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { hasAiConsent, setAiConsentStatus } from '../src/services/aiConsent';
import apiService from '../src/services/api';
import { borderRadius, colors, shadows, spacing } from '../src/theme';
import { TrainingPlan } from '../src/types';
import { translateToHindi } from '../src/utils/translate';

export default function TrainingPlanScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filename: string | string[]; days: string | string[] }>();
  
  // Normalize params - handle arrays from expo-router
  const filename = Array.isArray(params.filename) ? params.filename[0] : params.filename;
  const days = Array.isArray(params.days) ? params.days[0] : (params.days || '7');
  
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Language: English or Hindi (translation + TTS)
  type Lang = 'en' | 'hi';
  const [language, setLanguage] = useState<Lang>('en');
  const [translateLoading, setTranslateLoading] = useState(false);
  const [hindiTranslated, setHindiTranslated] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [translated, setTranslated] = useState<{
    overallNotes: string | null;
    planByDay: Record<
      number,
      {
        focus: string;
        warmup: string[];
        drills: Array<{ name: string; reps: string; notes?: string; youtube_url?: string }>;
        progression: string;
        notes?: string;
      }
    >;
  }>({ overallNotes: null, planByDay: {} });

  // Stop speech when user leaves this screen (back, tab switch, or any navigation)
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        setSpeaking(false);
      };
    }, [])
  );

  const confirmAiProcessing = (): Promise<boolean> => {
    return new Promise(resolve => {
      Alert.alert(
        'AI training plan permission',
        'Generating a training plan uses our AI processing partner (Google Gemini, Google LLC).\n\n' +
          'We will send:\n' +
          '- Your analysis summary (technique flaws/metrics)\n' +
          '- Your selected player context (e.g., player type, shot/bowling type)\n' +
          '- Your requested plan length (days)\n\n' +
          'We will not send your raw video to our AI processing partner (Google Gemini, Google LLC).\n\n' +
          'You can withdraw this consent anytime from Profile > AI Data Sharing.\n\n' +
          'Do you want to generate the training plan using our AI processing partner (Google Gemini, Google LLC)?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: 'Allow',
            onPress: async () => {
              await setAiConsentStatus('granted');
              resolve(true);
            },
          },
        ]
      );
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrainingPlan();
    setRefreshing(false);
  };

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

  const loadTrainingPlan = useCallback(async (showAlertOnNotFound: boolean = false) => {
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
      
      // Check if response.data contains an error (backend might return 200 with error object)
      if (response.data && typeof response.data === 'object' && response.data.error) {
        // Backend returned an error object, treat as plan not found
        console.log('Training plan not found (error in response.data)');
        if (showAlertOnNotFound) {
          Alert.alert(
            'No Training Plan Found',
            'You didn\'t generate the plan so no plan exists. Please generate a plan first.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Alert OK button pressed, alert closed');
                }
              }
            ]
          );
        }
        setTrainingPlan(null);
        setLoading(false);
        return;
      }
      
      if (response.success && response.data) {
        // Validate the training plan structure before setting it
        if (validateTrainingPlan(response.data)) {
          setTrainingPlan(response.data);
          setSelectedDay(1); // Select first day by default
        } else {
          // Invalid plan structure - treat it as no plan exists
          console.log('Invalid training plan structure');
          if (showAlertOnNotFound) {
            Alert.alert(
              'No Training Plan Found',
              'You didn\'t generate the plan so no plan exists. Please generate a plan first.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('Alert OK button pressed, alert closed');
                  }
                }
              ]
            );
          }
          setTrainingPlan(null);
        }
      } else {
        // Plan doesn't exist, show alert only if requested
        console.log('Training plan not found');
        if (showAlertOnNotFound) {
          Alert.alert(
            'No Training Plan Found',
            'You didn\'t generate the plan so no plan exists. Please generate a plan first.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Alert OK button pressed, alert closed');
                }
              }
            ]
          );
        }
        setTrainingPlan(null);
      }
    } catch (error: any) {
      console.error('Error loading training plan:', error);
      // If it's a 404, show the alert (plan doesn't exist) only if requested
      if (error.response?.status === 404) {
        if (showAlertOnNotFound) {
          Alert.alert(
            'No Training Plan Found',
            'You didn\'t generate the plan so no plan exists. Please generate a plan first.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Alert OK button pressed, alert closed');
                }
              }
            ]
          );
        }
      } else {
        // Other errors - show error alert only if requested
        if (showAlertOnNotFound) {
          Alert.alert(
            'Error',
            'Failed to load training plan. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Alert OK button pressed, alert closed');
                }
              }
            ]
          );
        }
      }
      setTrainingPlan(null);
    } finally {
      setLoading(false);
    }
  }, [filename]);

  // Reset Hindi translation cache when a new plan loads
  useEffect(() => {
    setHindiTranslated(false);
    setTranslated({ overallNotes: null, planByDay: {} });
    Speech.stop();
    setSpeaking(false);
  }, [trainingPlan]);

  const loadHindiTranslation = useCallback(async () => {
    if (!trainingPlan) return;
    setTranslateLoading(true);
    try {
      const overallNotesHi = trainingPlan.overall_notes
        ? await translateToHindi(trainingPlan.overall_notes)
        : '';

      const planByDay: Record<
        number,
        {
          focus: string;
          warmup: string[];
          drills: Array<{ name: string; reps: string; notes?: string; youtube_url?: string }>;
          progression: string;
          notes?: string;
        }
      > = {};

      await Promise.all(
        trainingPlan.plan.map(async (day) => {
          const focusHi = day.focus ? await translateToHindi(day.focus) : day.focus;
          const warmupHi = await Promise.all(day.warmup.map((w) => translateToHindi(w)));

          const drillsHi = await Promise.all(
            day.drills.map(async (drill) => {
              const nameHi = drill?.name
                ? await translateToHindi(drill.name)
                : drill?.name || 'Drill';
              const notesHi = drill?.notes ? await translateToHindi(drill.notes) : undefined;
              return { name: nameHi, reps: drill?.reps || 'N/A', notes: notesHi, youtube_url: drill?.youtube_url };
            })
          );

          const progressionHi = day.progression ? await translateToHindi(day.progression) : day.progression;
          const notesHi = day.notes ? await translateToHindi(day.notes) : undefined;

          planByDay[day.day] = {
            focus: focusHi,
            warmup: warmupHi,
            drills: drillsHi,
            progression: progressionHi,
            notes: notesHi,
          };
        })
      );

      setTranslated({ overallNotes: overallNotesHi || null, planByDay });
    } catch (e) {
      console.warn('Hindi translation failed', e);
    } finally {
      setTranslateLoading(false);
      setHindiTranslated(true);
    }
  }, [trainingPlan]);

  const openDrillYoutube = useCallback(async (drill: any) => {
    try {
      const urlFromApi = typeof drill?.youtube_url === 'string' ? drill.youtube_url : '';
      const name = typeof drill?.name === 'string' ? drill.name : 'cricket drill';
      const fallback = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' cricket drill')}`;
      const url = urlFromApi || fallback;

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Cannot open YouTube link on this device' });
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e?.message || 'Failed to open YouTube link' });
    }
  }, []);

  useEffect(() => {
    if (language === 'hi' && trainingPlan && !hindiTranslated && !translateLoading) {
      loadHindiTranslation();
    }
  }, [language, trainingPlan, hindiTranslated, translateLoading, loadHindiTranslation]);

  const getFullTextForSpeech = useCallback((): string => {
    if (!trainingPlan || !selectedDay) return '';
    const isHi = language === 'hi';

    const day = trainingPlan.plan.find((d) => d.day === selectedDay) || trainingPlan.plan[0];
    if (!day) return '';

    const dayTranslation = translated.planByDay[day.day];

    const parts: string[] = [];

    // Add a top-level heading so speech starts like a title.
    parts.push(isHi ? 'प्रशिक्षण योजना.' : 'Training Plan.');

    if (trainingPlan.overall_notes) {
      parts.push(isHi ? 'साप्ताहिक अवलोकन.' : 'Weekly Overview.');
      parts.push(isHi && translated.overallNotes ? translated.overallNotes : trainingPlan.overall_notes);
    }

    const focusText = isHi && dayTranslation?.focus ? dayTranslation.focus : day.focus;
    parts.push(isHi ? `दिन ${day.day}.` : `Day ${day.day}.`);
    parts.push(isHi ? 'फोकस:' : 'Focus:');
    if (focusText) parts.push(focusText);

    const warmupList = isHi && dayTranslation?.warmup ? dayTranslation.warmup : day.warmup;
    parts.push(isHi ? 'वार्मअप (10-15 मिनट).' : 'Warmup (10-15 minutes).');
    if (warmupList?.length) parts.push(warmupList.join('. ') + '.');

    const drillsList = isHi && dayTranslation?.drills ? dayTranslation.drills : day.drills;
    parts.push(isHi ? 'मुख्य ड्रिल्स (25-35 मिनट).' : 'Main Drills (25-35 minutes).');
    if (drillsList?.length) {
      drillsList.forEach((drill, i) => {
        const prefix = isHi ? `ड्रिल ${i + 1}.` : `Drill ${i + 1}.`;
        parts.push(prefix);
        if (drill.name) parts.push(drill.name);
        if (drill.reps) parts.push(isHi ? `दोहराव: ${drill.reps}.` : `Reps: ${drill.reps}.`);
        if (drill.notes) parts.push(isHi ? `नोट्स: ${drill.notes}.` : `Notes: ${drill.notes}.`);
      });
    }

    const progressionText = isHi && dayTranslation?.progression ? dayTranslation.progression : day.progression;
    parts.push(isHi ? 'प्रगति.' : 'Progression.');
    if (progressionText) parts.push(progressionText);

    if (day.notes) {
      const coachNotesText = isHi && dayTranslation?.notes ? dayTranslation.notes : day.notes;
      parts.push(isHi ? 'कोच के नोट्स.' : "Coach's Notes.");
      if (coachNotesText) parts.push(coachNotesText);
    }

    // Use new lines to create natural pauses so headings sound like headings.
    return parts.filter(Boolean).join('\n');
  }, [language, translated, selectedDay, trainingPlan]);

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

  const generateTrainingPlan = async () => {
    if (!filename || typeof filename !== 'string') {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Invalid filename parameter',
      });
      return;
    }

    // Apple App Review requires runtime consent/withdrawal for third-party AI sharing.
    // We show/block behind this UX on iOS only.
    if (Platform.OS === 'ios') {
      const consentGranted = await hasAiConsent();
      if (!consentGranted) {
        const allowed = await confirmAiProcessing();
        if (!allowed) return;
      }
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
    const translatedDay = language === 'hi' ? translated.planByDay[day.day] : undefined;
    
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
              {translatedDay?.focus || day.focus || (language === 'hi' ? 'प्रशिक्षण दिवस' : 'Training Day')}
            </Text>
            <Text style={[styles.dayDuration, { color: theme.colors.onSurfaceVariant }]}>
              {language === 'hi' ? '~45-60 मिनट सत्र' : '~45-60 min session'}
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
    const translatedDay = language === 'hi' ? translated.planByDay[day.day] : undefined;

    return (
      <Surface style={[styles.selectedDayCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.selectedDayHeader}>
          <Text style={[styles.selectedDayTitle, { color: theme.colors.onSurface }]}>
            {language === 'hi'
              ? `दिन ${day.day}: ${translatedDay?.focus || day.focus}`
              : `Day ${day.day}: ${day.focus}`}
          </Text>
          <Chip mode="outlined" textStyle={{ color: theme.colors.primary }}>
            {day.day === 1
              ? language === 'hi'
                ? 'यहां से शुरू करें'
                : 'Start Here'
              : language === 'hi'
                ? 'जारी रखें'
                : 'Continue'}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        {/* Warmup Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>🔥</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {language === 'hi' ? 'वार्मअप (10-15 मिनट)' : 'Warmup (10-15 min)'}
            </Text>
          </View>
          {Array.isArray(day.warmup) && day.warmup.map((exercise, index) => (
            <View key={index} style={styles.exerciseItem}>
              <Text style={styles.bulletPoint}>•</Text>
              <Text style={[styles.exerciseText, { color: theme.colors.onSurfaceVariant }]}>
                {language === 'hi' && translatedDay?.warmup?.[index] != null
                  ? translatedDay.warmup[index]
                  : exercise}
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
              {language === 'hi' ? 'मुख्य ड्रिल्स (25-35 मिनट)' : 'Main Drills (25-35 min)'}
            </Text>
          </View>
          {Array.isArray(day.drills) && day.drills.map((drill, index) => (
            <Card key={index} style={styles.drillCard} mode="outlined">
              <Card.Content>
                <View style={styles.drillHeader}>
                  <Text style={[styles.drillName, { color: theme.colors.onSurface }]}>
                    {language === 'hi' && translatedDay?.drills?.[index]?.name
                      ? translatedDay.drills[index].name
                      : drill?.name || 'Drill'}
                  </Text>
                  <View style={styles.drillHeaderRight}>
                    <IconButton
                      icon="youtube"
                      size={18}
                      onPress={() => openDrillYoutube(drill)}
                      accessibilityLabel="Open drill video on YouTube"
                    />
                    <Chip mode="outlined" compact>
                      {drill?.reps || 'N/A'}
                    </Chip>
                  </View>
                </View>
                {drill?.notes && (
                  <Text style={[styles.drillNotes, { color: theme.colors.onSurfaceVariant }]}>
                    💡{' '}
                    {language === 'hi' && translatedDay?.drills?.[index]?.notes != null
                      ? translatedDay.drills[index].notes
                      : drill.notes}
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
              {language === 'hi' ? 'प्रगति' : 'Progression'}
            </Text>
          </View>
          <Text style={[styles.progressionText, { color: theme.colors.onSurfaceVariant }]}>
            {language === 'hi' && translatedDay?.progression ? translatedDay.progression : day.progression}
          </Text>
        </View>

        {day.notes && (
          <>
            <Divider style={styles.divider} />
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>💭</Text>
                <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  {language === 'hi' ? 'कोच के नोट्स' : "Coach's Notes"}
                </Text>
              </View>
              <Text style={[styles.notesText, { color: theme.colors.onSurfaceVariant }]}>
                {language === 'hi' && translatedDay?.notes ? translatedDay.notes : day.notes}
              </Text>
            </View>
          </>
        )}
      </Surface>
    );
  };

  const renderLanguageBar = () => {
    if (!trainingPlan) return null;

    return (
      <View style={styles.languageBar}>
        <View style={styles.languageToggle}>
          <TouchableOpacity
            style={[
              styles.langButton,
              language === 'en' && styles.langButtonActive,
              {
                borderColor: theme.colors.outline,
                backgroundColor:
                  language === 'en' ? theme.colors.primary : theme.colors.surface,
              },
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
              {
                borderColor: theme.colors.outline,
                backgroundColor:
                  language === 'hi' ? theme.colors.primary : theme.colors.surface,
              },
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
            { backgroundColor: theme.colors.secondary },
          ]}
          onPress={handleSpeak}
        >
          <Text style={styles.speakButtonText}>{speaking ? '⏹ Stop' : '🔊 Speak'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            {language === 'hi' ? 'प्रशिक्षण योजना लोड हो रही है...' : 'Loading training plan...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Surface
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            // Ensures the header title stays visible under the status bar/notch
            paddingTop: (insets.top || 0) + spacing.lg,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => router.back()}
          />
          <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
            {language === 'hi' ? 'प्रशिक्षण योजना' : 'Training Plan'}
          </Text>
          <View style={{ width: 48 }} />
        </View>
      </Surface>

      {/* Fixed Language + TTS bar (should not scroll away) */}
      {trainingPlan ? renderLanguageBar() : null}

      <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
        {!trainingPlan ? (
          // Generate Plan View
          <View style={styles.generateContainer}>
            <Surface style={[styles.generateCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={styles.generateIcon}>🏋️‍♂️</Text>
              <Text style={[styles.generateTitle, { color: theme.colors.onSurface }]}>
                {language === 'hi' ? 'प्रशिक्षण योजना बनाएं' : 'Generate Training Plan'}
              </Text>
              <Text style={[styles.generateDescription, { color: theme.colors.onSurfaceVariant }]}>
                {language === 'hi'
                  ? `आपके विश्लेषण के आधार पर ${days}-दिन की व्यक्तिगत प्रशिक्षण योजना बनाएं`
                  : `Create a personalized ${days}-day training plan based on your analysis results`}
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
                  {generating
                    ? language === 'hi'
                      ? 'बनाया जा रहा है...'
                      : 'Generating...'
                    : language === 'hi'
                      ? 'योजना बनाएं'
                      : 'Generate Plan'}
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => loadTrainingPlan(true)}
                  loading={loading}
                  disabled={loading}
                  style={styles.checkButton}
                  contentStyle={styles.checkButtonContent}
                >
                  {loading
                    ? language === 'hi'
                      ? 'जांच हो रही है...'
                      : 'Checking...'
                    : language === 'hi'
                      ? 'मौजूदा योजना जांचें'
                      : 'Check Existing Plan'}
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
                    {language === 'hi' ? 'साप्ताहिक अवलोकन' : 'Weekly Overview'}
                  </Text>
                </View>
                <Text style={[styles.overallNotesText, { color: theme.colors.onSurfaceVariant }]}>
                  {language === 'hi' && translated.overallNotes
                    ? translated.overallNotes
                    : trainingPlan.overall_notes}
                </Text>
              </Surface>
            )}

            {/* Day Selection */}
            <View style={styles.daysContainer}>
              <Text style={[styles.daysTitle, { color: theme.colors.onBackground }]}>
                {language === 'hi' ? 'प्रशिक्षण दिवस' : 'Training Days'}
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
    fontSize: 17,
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
    fontSize: 14,
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
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  generateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  generateDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
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
    fontSize: 20,
    marginRight: spacing.sm,
  },
  overallNotesTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  overallNotesText: {
    fontSize: 12,
    lineHeight: 18,
  },
  daysContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  daysTitle: {
    fontSize: 15,
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
    fontSize: 14,
    fontWeight: 'bold',
  },
  dayInfo: {
    alignItems: 'center',
  },
  dayFocus: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  dayDuration: {
    fontSize: 9,
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
    fontSize: 17,
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
    fontSize: 17,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    fontSize: 14,
    marginRight: spacing.sm,
    marginTop: 2,
    color: colors.cricket.green,
  },
  exerciseText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
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
  drillHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  drillName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  drillNotes: {
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  progressionText: {
    fontSize: 12,
    lineHeight: 18,
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
  languageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.md,
    // Keep the language toggle + TTS button fully below the header.
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