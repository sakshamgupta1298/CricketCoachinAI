import React, { useEffect } from 'react';
import { Modal, StyleSheet, View, Dimensions } from 'react-native';
import { Text, ProgressBar, useTheme } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { borderRadius, spacing } from '../theme';

const { width, height } = Dimensions.get('window');

interface AnalysisScreenProps {
  visible: boolean;
  progress?: number;
  status?: 'uploading' | 'processing' | 'analyzing';
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  visible,
  progress = 0,
  status = 'uploading',
}) => {
  const theme = useTheme();

  // Animation values
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);
  const shimmer = useSharedValue(0);

  // Start animations
  useEffect(() => {
    if (visible) {
      // Rotating cricket ball animation
      rotation.value = withRepeat(
        withTiming(360, {
          duration: 2000,
          easing: Easing.linear,
        }),
        -1,
        false
      );

      // Pulsing scale animation
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Pulse animation for icon
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Shimmer effect
      shimmer.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      // Reset animations when hidden
      rotation.value = 0;
      scale.value = 1;
      pulse.value = 1;
      shimmer.value = 0;
    }
  }, [visible]);

  // Animated styles
  const ballStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { scale: scale.value },
      ],
    };
  });

  const iconStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulse.value }],
    };
  });

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmer.value,
      [0, 1],
      [-width, width],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX }],
    };
  });

  // Get status message
  const getStatusMessage = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading your video...';
      case 'processing':
        return 'Processing video frames...';
      case 'analyzing':
        return 'Analyzing your technique...';
      default:
        return 'Preparing analysis...';
    }
  };

  const getStatusSubtext = () => {
    switch (status) {
      case 'uploading':
        return 'Please wait while we upload your video';
      case 'processing':
        return 'Extracting key movements and poses';
      case 'analyzing':
        return 'AI is analyzing your cricket technique';
      default:
        return 'Getting everything ready';
    }
  };

  // Calculate display progress (smooth transitions between stages)
  const displayProgress = React.useMemo(() => {
    if (status === 'uploading') {
      return Math.min(progress, 33);
    } else if (status === 'processing') {
      return Math.min(33 + (progress / 3), 66);
    } else {
      return Math.min(66 + (progress / 3), 100);
    }
  }, [progress, status]);

  // Get gradient colors based on theme
  const getGradientColors = () => {
    const isDark = theme.dark;
    if (isDark) {
      return [
        'rgba(59, 130, 246, 0.2)',
        'rgba(30, 58, 95, 0.3)',
        theme.colors.background,
      ];
    }
    return [
      'rgba(0, 102, 255, 0.15)',
      'rgba(227, 242, 253, 0.3)',
      theme.colors.background,
    ];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={getGradientColors()}
          style={styles.gradient}
        >
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.container}
          >
            {/* Shimmer effect overlay */}
            <Animated.View
              style={[
                styles.shimmerOverlay,
                shimmerStyle,
                {
                  backgroundColor: theme.dark 
                    ? 'rgba(59, 130, 246, 0.08)' 
                    : 'rgba(0, 102, 255, 0.08)',
                },
              ]}
            />

            {/* Main content */}
            <View style={[
              styles.content,
              {
                backgroundColor: theme.dark 
                  ? 'rgba(31, 41, 55, 0.95)' 
                  : 'rgba(255, 255, 255, 0.95)',
              }
            ]}>
              {/* Animated Cricket Ball Icon */}
              <View style={styles.iconContainer}>
                <Animated.View style={[styles.ballContainer, ballStyle]}>
                  <View
                    style={[
                      styles.cricketBall,
                      {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primaryContainer,
                      },
                    ]}
                  >
                    <View style={styles.ballSeam} />
                    <View style={[styles.ballSeam, styles.ballSeamVertical]} />
                  </View>
                </Animated.View>

                {/* Animated Analysis Icon */}
                <Animated.View style={[styles.analysisIcon, iconStyle]}>
                  <Text style={[styles.iconEmoji, { color: theme.colors.primary }]}>
                    🏏
                  </Text>
                </Animated.View>
              </View>

              {/* Status Text */}
              <Animated.View
                entering={FadeIn.delay(200).duration(400)}
                style={styles.textContainer}
              >
                <Text
                  style={[
                    styles.title,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {getStatusMessage()}
                </Text>
                <Text
                  style={[
                    styles.subtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {getStatusSubtext()}
                </Text>
              </Animated.View>

              {/* Progress Bar */}
              <Animated.View
                entering={FadeIn.delay(400).duration(400)}
                style={styles.progressContainer}
              >
                <ProgressBar
                  progress={displayProgress / 100}
                  color={theme.colors.primary}
                  style={styles.progressBar}
                />
                <Text
                  style={[
                    styles.progressText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {Math.round(displayProgress)}%
                </Text>
              </Animated.View>

              {/* Stage Indicators */}
              <Animated.View
                entering={FadeIn.delay(600).duration(400)}
                style={styles.stagesContainer}
              >
                <View style={styles.stage}>
                  <View
                    style={[
                      styles.stageDot,
                      {
                        backgroundColor:
                          status === 'uploading'
                            ? theme.colors.primary
                            : theme.colors.primaryContainer,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stageText,
                      {
                        color:
                          status === 'uploading'
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        fontWeight:
                          status === 'uploading' ? '700' : '400',
                      },
                    ]}
                  >
                    Upload
                  </Text>
                </View>

                <View style={styles.stage}>
                  <View
                    style={[
                      styles.stageDot,
                      {
                        backgroundColor:
                          status === 'processing'
                            ? theme.colors.primary
                            : status === 'analyzing'
                            ? theme.colors.primaryContainer
                            : theme.colors.surfaceVariant,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stageText,
                      {
                        color:
                          status === 'processing'
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        fontWeight:
                          status === 'processing' ? '700' : '400',
                      },
                    ]}
                  >
                    Process
                  </Text>
                </View>

                <View style={styles.stage}>
                  <View
                    style={[
                      styles.stageDot,
                      {
                        backgroundColor:
                          status === 'analyzing'
                            ? theme.colors.primary
                            : theme.colors.surfaceVariant,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stageText,
                      {
                        color:
                          status === 'analyzing'
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                        fontWeight:
                          status === 'analyzing' ? '700' : '400',
                      },
                    ]}
                  >
                    Analyze
                  </Text>
                </View>
              </Animated.View>
            </View>
          </Animated.View>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: width * 0.3,
    opacity: 0.3,
  },
  content: {
    borderRadius: borderRadius.xl,
    padding: spacing.xl * 1.5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
    position: 'relative',
  },
  ballContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cricketBall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  ballSeam: {
    position: 'absolute',
    width: 70,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  ballSeamVertical: {
    width: 2,
    height: 70,
  },
  analysisIcon: {
    position: 'absolute',
    zIndex: 1,
  },
  iconEmoji: {
    fontSize: 48,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  stagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: spacing.md,
  },
  stage: {
    alignItems: 'center',
    flex: 1,
  },
  stageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: spacing.xs,
  },
  stageText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default AnalysisScreen;

