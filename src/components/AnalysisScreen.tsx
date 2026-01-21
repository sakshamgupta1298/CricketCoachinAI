import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, Modal, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  Easing,
  Extrapolate,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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

  // Circular loader spin (reuse rotation value)
  const circularSpinStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  // Get status message
  const getStatusMessage = () => {
    return 'Analyzing your video...';
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

  const getTimeEstimateText = () => {
    return 'Analysis usually takes ~5–6 minutes.';
  };

  const getReassuranceText = () => {
    if (status === 'uploading') {
      return 'This is normal—large videos can take a moment to send.';
    }
    if (status === 'processing') {
      return 'This is normal—we’re breaking the video into frames for accurate tracking.';
    }
    return 'This is normal—more time means higher-quality, more detailed feedback.';
  };

  // We intentionally do not show numeric progress; the circular spinner is purely visual.

  // Get gradient colors based on theme
  const getGradientColors = (): [string, string, string] => {
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
              {/* Cricket-inspired pitch lines (subtle background) */}
              <View style={styles.pitchLines} pointerEvents="none">
                <View
                  style={[
                    styles.pitchLine,
                    { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                />
                <View
                  style={[
                    styles.pitchLine,
                    styles.pitchLineMid,
                    { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)' },
                  ]}
                />
              </View>

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

              {/* Time estimate + reassurance */}
              <Animated.View
                entering={FadeIn.delay(320).duration(400)}
                style={styles.infoContainer}
              >
                <View style={[
                  styles.infoPill,
                  {
                    backgroundColor: theme.dark
                      ? 'rgba(59, 130, 246, 0.12)'
                      : 'rgba(0, 102, 255, 0.10)',
                    borderColor: theme.dark
                      ? 'rgba(59, 130, 246, 0.25)'
                      : 'rgba(0, 102, 255, 0.18)',
                  }
                ]}>
                  <Text style={[styles.infoEmoji, { color: theme.colors.primary }]}>🕒</Text>
                  <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
                    {getTimeEstimateText()}
                  </Text>
                </View>

                <Text style={[styles.reassuranceText, { color: theme.colors.onSurfaceVariant }]}>
                  {getReassuranceText()}
                </Text>
              </Animated.View>

              {/* Intentionally no bottom loader (keep screen clean) */}
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
  pitchLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  pitchLine: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    height: 2,
    top: '22%',
    borderRadius: 2,
  },
  pitchLineMid: {
    top: '52%',
    height: 1,
    left: '16%',
    right: '16%',
  },
  pitchLineBottom: {
    top: '82%',
    height: 2,
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
  infoContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  infoPill: {
    width: '100%',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoEmoji: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  reassuranceText: {
    marginTop: spacing.sm,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    opacity: 0.95,
  },
  // (loader styles removed)
});

export default AnalysisScreen;

