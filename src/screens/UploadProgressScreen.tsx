import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { ProgressIndicator } from '../components/ui/ProgressIndicator';
import { Colors, Spacing, Typography } from '../design/DesignSystem';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');

type UploadProgressScreenNavigationProp = StackNavigationProp<RootStackParamList, 'UploadProgress'>;
type UploadProgressScreenRouteProp = RouteProp<RootStackParamList, 'UploadProgress'>;

export const UploadProgressScreen: React.FC = () => {
  const navigation = useNavigation<UploadProgressScreenNavigationProp>();
  const route = useRoute<UploadProgressScreenRouteProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'uploading' | 'analyzing' | 'complete' | 'error'>('uploading');

  const steps = [
    { title: 'Uploading Video', icon: 'cloud-upload', color: Colors.primary[500] },
    { title: 'Processing Video', icon: 'videocam', color: Colors.secondary[500] },
    { title: 'AI Analysis', icon: 'analytics', color: Colors.accent[500] },
    { title: 'Generating Report', icon: 'document-text', color: Colors.primary[600] },
  ];

  useEffect(() => {
    // Simulate upload and analysis process
    const simulateProgress = async () => {
      // Upload phase (0-30%)
      for (let i = 0; i <= 30; i += 2) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setStatus('analyzing');
      setCurrentStep(1);
      
      // Processing phase (30-60%)
      for (let i = 30; i <= 60; i += 2) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      
      setCurrentStep(2);
      
      // Analysis phase (60-90%)
      for (let i = 60; i <= 90; i += 2) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      setCurrentStep(3);
      
      // Final phase (90-100%)
      for (let i = 90; i <= 100; i += 2) {
        setProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setStatus('complete');
      
      // Navigate to results after completion
      setTimeout(() => {
        navigation.replace('Results', { results: { videoUri: route.params.videoUri } });
      }, 2000);
    };

    simulateProgress();
  }, [navigation, route.params.videoUri]);

  const getStatusText = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading your cricket video...';
      case 'analyzing':
        return 'AI is analyzing your technique...';
      case 'complete':
        return 'Analysis complete!';
      case 'error':
        return 'Something went wrong. Please try again.';
      default:
        return 'Processing...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
        return Colors.primary[500];
      case 'analyzing':
        return Colors.secondary[500];
      case 'complete':
        return Colors.success;
      case 'error':
        return Colors.error;
      default:
        return Colors.primary[500];
    }
  };

  const getProgressColor = () => {
    if (status === 'error') return Colors.error;
    if (status === 'complete') return Colors.success;
    return getStatusColor();
  };

  return (
    <LinearGradient
      colors={[Colors.background.light, Colors.background.lightSecondary]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cricket Analysis</Text>
          <Text style={styles.subtitle}>{getStatusText()}</Text>
        </View>

        {/* Progress Circle */}
        <View style={styles.progressContainer}>
          <ProgressIndicator
            progress={progress}
            size={200}
            strokeWidth={12}
            color={getProgressColor()}
            showPercentage={true}
          />
          
          {/* Status Icon */}
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor() }]}>
            {status === 'complete' ? (
              <Ionicons name="checkmark" size={32} color={Colors.text.inverse} />
            ) : status === 'error' ? (
              <Ionicons name="alert-circle" size={32} color={Colors.text.inverse} />
            ) : (
              <Ionicons name="analytics" size={32} color={Colors.text.inverse} />
            )}
          </View>
        </View>

        {/* Steps Progress */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepItem}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor:
                      index <= currentStep ? step.color : Colors.neutral[300],
                  },
                ]}
              >
                <Ionicons
                  name={step.icon as any}
                  size={20}
                  color={index <= currentStep ? Colors.text.inverse : Colors.text.secondary}
                />
              </View>
              <Text
                style={[
                  styles.stepTitle,
                  {
                    color: index <= currentStep ? Colors.text.primary : Colors.text.secondary,
                  },
                ]}
              >
                {step.title}
              </Text>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor:
                        index < currentStep ? step.color : Colors.neutral[300],
                    },
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {/* Tips */}
        {status === 'uploading' && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips for better analysis:</Text>
            <Text style={styles.tipText}>• Ensure good lighting</Text>
            <Text style={styles.tipText}>• Keep the camera steady</Text>
            <Text style={styles.tipText}>• Record from a side angle</Text>
            <Text style={styles.tipText}>• Include your full body in frame</Text>
          </View>
        )}

        {status === 'analyzing' && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>🔍 What we're analyzing:</Text>
            <Text style={styles.tipText}>• Body posture and stance</Text>
            <Text style={styles.tipText}>• Movement patterns</Text>
            <Text style={styles.tipText}>• Technique efficiency</Text>
            <Text style={styles.tipText}>• Potential improvements</Text>
          </View>
        )}

        {status === 'complete' && (
          <View style={styles.completeContainer}>
            <Text style={styles.completeTitle}>🎉 Analysis Complete!</Text>
            <Text style={styles.completeText}>
              Your detailed cricket technique report is ready. View your results and get personalized coaching recommendations.
            </Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>❌ Upload Failed</Text>
            <Text style={styles.errorText}>
              There was an issue processing your video. Please check your internet connection and try again.
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  progressContainer: {
    position: 'relative',
    marginBottom: Spacing['2xl'],
  },
  statusIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    marginLeft: -30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  stepsContainer: {
    width: '100%',
    marginBottom: Spacing['2xl'],
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  stepLine: {
    width: 2,
    height: 30,
    marginLeft: Spacing.md,
  },
  tipsContainer: {
    backgroundColor: Colors.background.light,
    padding: Spacing.lg,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tipText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  completeContainer: {
    backgroundColor: Colors.success + '10',
    padding: Spacing.lg,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  completeTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.success,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  completeText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  errorContainer: {
    backgroundColor: Colors.error + '10',
    padding: Spacing.lg,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.error + '30',
  },
  errorTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
}); 
