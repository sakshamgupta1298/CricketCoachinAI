import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import apiService from '../src/services/api';
import { borderRadius, spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

const PITCH_LENGTH_METERS = 20.12;

export default function BallSpeedScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const sessionIdRef = useRef<string>('');

  const [isTracking, setIsTracking] = useState(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [smoothedSpeedKmh, setSmoothedSpeedKmh] = useState(0);
  const [lastDetectionConfidence, setLastDetectionConfidence] = useState(0);
  const [isBallDetected, setIsBallDetected] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [trackingMode, setTrackingMode] = useState<'yolo' | 'fallback' | 'checking'>('checking');
  const [frameIntervalMsInput, setFrameIntervalMsInput] = useState('250');

  const [metersPerPixelInput, setMetersPerPixelInput] = useState('0.015');
  const [pitchPixelLengthInput, setPitchPixelLengthInput] = useState('');

  const metersPerPixel = useMemo(() => {
    const pitchPixelLength = Number(pitchPixelLengthInput);
    if (pitchPixelLength > 0) {
      return PITCH_LENGTH_METERS / pitchPixelLength;
    }
    const mpp = Number(metersPerPixelInput);
    return mpp > 0 ? mpp : 0.015;
  }, [metersPerPixelInput, pitchPixelLengthInput]);

  const frameIntervalMs = useMemo(() => {
    const val = Number(frameIntervalMsInput);
    return val >= 120 ? val : 250;
  }, [frameIntervalMsInput]);

  const stopTrackingInterval = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const endSession = async () => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    await apiService.endBallSpeedSession(sid);
    sessionIdRef.current = '';
  };

  const processOneFrame = async () => {
    if (!cameraRef.current || inFlightRef.current || !sessionIdRef.current) return;
    inFlightRef.current = true;

    try {
      const frame = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.35,
        skipProcessing: true,
      });

      if (!frame?.base64) {
        setStatusText('No frame data captured');
        return;
      }

      const response = await apiService.processBallSpeedFrame({
        session_id: sessionIdRef.current,
        image_base64: frame.base64,
        meters_per_pixel: metersPerPixel,
        pitch_pixel_length: Number(pitchPixelLengthInput) || 0,
        confidence: 0.25,
      });

      if (!response.success || !response.data?.success) {
        setStatusText(response.error || response.data?.error || 'Ball speed processing failed');
        return;
      }

      const data = response.data;
      setCurrentSpeedKmh(Number(data.current_speed_kmh) || 0);
      setSmoothedSpeedKmh(Number(data.smoothed_speed_kmh) || 0);
      setLastDetectionConfidence(Number(data.detection_confidence) || 0);
      setIsBallDetected(Boolean(data.detected));
      setStatusText(data.detected ? 'Ball detected' : 'Tracking... ball not detected');
    } catch (error: any) {
      setStatusText(error?.message || 'Failed to capture/process frame');
    } finally {
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    const loadStatus = async () => {
      const res = await apiService.getBallSpeedStatus();
      if (res.success && res.data?.success) {
        setTrackingMode(res.data.mode === 'yolo' ? 'yolo' : 'fallback');
        return;
      }
      setTrackingMode('fallback');
    };
    void loadStatus();
  }, []);

  useEffect(() => {
    return () => {
      stopTrackingInterval();
      void endSession();
    };
  }, []);

  const resetTracker = async () => {
    stopTrackingInterval();
    setIsTracking(false);
    setCurrentSpeedKmh(0);
    setSmoothedSpeedKmh(0);
    setLastDetectionConfidence(0);
    setIsBallDetected(false);
    setStatusText('Ready');
    await endSession();
  };

  const startTracking = () => {
    const mpp = Number.isFinite(metersPerPixel) ? metersPerPixel : 0;
    if (mpp <= 0) {
      Alert.alert('Invalid calibration', 'Please provide a valid meters-per-pixel value.');
      return;
    }

    const sid = `bs_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    sessionIdRef.current = sid;
    setCurrentSpeedKmh(0);
    setSmoothedSpeedKmh(0);
    setStatusText('Initializing tracker...');
    setIsTracking(true);
    stopTrackingInterval();

    // Run first cycle immediately to reduce startup delay.
    void processOneFrame();
    pollIntervalRef.current = setInterval(() => {
      void processOneFrame();
    }, frameIntervalMs);
  };

  const pauseTracking = () => {
    stopTrackingInterval();
    setIsTracking(false);
    setStatusText('Paused');
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centeredContainer}>
          <Text style={{ color: theme.colors.onBackground }}>Loading camera permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centeredContainer}>
          <Text style={[styles.permissionText, { color: theme.colors.onBackground }]}>
            Camera permission is required to check live ball speed.
          </Text>
          <PremiumButton title="Allow Camera Access" onPress={requestPermission} variant="primary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PremiumCard variant="outlined" padding="large" style={styles.card}>
          <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
            Live Ball Speed Checker
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
            Auto-detect ball speed using backend vision processing in real-time.
          </Text>
          <Text style={[styles.modeText, { color: theme.colors.onSurfaceVariant }]}>
            Mode:{' '}
            {trackingMode === 'checking'
              ? 'Checking...'
              : trackingMode === 'yolo'
                ? 'High accuracy (YOLO)'
                : 'Fallback (contour tracking)'}
          </Text>
        </PremiumCard>

        <PremiumCard variant="elevated" padding="medium" style={styles.card}>
          <View style={styles.cameraWrapper}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={styles.overlayPanel}>
              <Text style={[styles.overlayText, { color: '#FFFFFF' }]}>
                {isTracking ? 'Streaming frames to backend...' : 'Press Start Tracking'}
              </Text>
              <Text style={[styles.overlaySubText, { color: '#FFFFFF' }]}>{statusText}</Text>
            </View>
          </View>
        </PremiumCard>

        <PremiumCard variant="elevated" padding="large" style={styles.card}>
          <TextInput
            label="Meters per pixel (default 0.015)"
            value={metersPerPixelInput}
            onChangeText={setMetersPerPixelInput}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Pitch pixel length (optional)"
            value={pitchPixelLengthInput}
            onChangeText={setPitchPixelLengthInput}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Frame interval ms (recommended 200-300)"
            value={frameIntervalMsInput}
            onChangeText={setFrameIntervalMsInput}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
          />
          <Text style={[styles.calibrationText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
            Active calibration: {metersPerPixel.toFixed(6)} meters/pixel
          </Text>
        </PremiumCard>

        <PremiumCard variant="outlined" padding="large" style={styles.card}>
          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Live Speed (5-frame)</Text>
          <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>{currentSpeedKmh.toFixed(1)} km/h</Text>

          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.md) }]}>
            Smoothed Speed
          </Text>
          <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{smoothedSpeedKmh.toFixed(1)} km/h</Text>

          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.md) }]}>
            Ball Detection
          </Text>
          <Text style={[styles.detectionText, { color: isBallDetected ? theme.colors.primary : theme.colors.error }]}>
            {isBallDetected ? `Detected (conf ${lastDetectionConfidence.toFixed(2)})` : 'Not detected'}
          </Text>
        </PremiumCard>

        <View style={styles.actionsRow}>
          <PremiumButton
            title={isTracking ? 'Pause' : 'Start Tracking'}
            onPress={isTracking ? pauseTracking : startTracking}
            variant="primary"
            size="medium"
          />
          <PremiumButton title="Reset" onPress={() => void resetTracker()} variant="secondary" size="medium" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: getResponsiveSize(spacing.lg),
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(spacing.lg),
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.md),
  },
  card: {
    marginBottom: getResponsiveSize(spacing.lg),
  },
  title: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.xs),
  },
  subtitle: {
    lineHeight: getResponsiveSize(18),
  },
  modeText: {
    marginTop: getResponsiveSize(spacing.xs),
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  cameraWrapper: {
    height: getResponsiveSize(340),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlayPanel: {
    position: 'absolute',
    left: getResponsiveSize(spacing.sm),
    top: getResponsiveSize(spacing.sm),
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: borderRadius.md,
    paddingHorizontal: getResponsiveSize(spacing.sm),
    paddingVertical: getResponsiveSize(spacing.xs),
  },
  overlayText: {
    fontWeight: '600',
  },
  overlaySubText: {
    marginTop: getResponsiveSize(2),
    fontSize: getResponsiveFontSize(11),
  },
  input: {
    marginBottom: getResponsiveSize(spacing.md),
  },
  calibrationText: {
    fontStyle: 'italic',
  },
  metricLabel: {
    fontSize: getResponsiveFontSize(13),
    fontWeight: '500',
  },
  metricValue: {
    fontSize: getResponsiveFontSize(30),
    fontWeight: '800',
    marginTop: getResponsiveSize(spacing.xs),
  },
  detectionText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    marginTop: getResponsiveSize(spacing.xs),
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(spacing.sm),
    marginBottom: getResponsiveSize(spacing.xl),
  },
});
