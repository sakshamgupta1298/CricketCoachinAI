import { useCameraPermissions } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type BallSpeedCameraCaptureRef, BallSpeedCameraPreview } from '@/components/ball-speed';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import apiService from '../src/services/api';
import { borderRadius, spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

const PITCH_LENGTH_METERS = 20.12;

export default function BallSpeedScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<BallSpeedCameraCaptureRef | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const sessionIdRef = useRef<string>('');
  const trackingActiveRef = useRef(false);

  const [isTracking, setIsTracking] = useState(false);
  const [finalSpeedKmh, setFinalSpeedKmh] = useState<number | null>(null);
  const [trackedFrames, setTrackedFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [finalizeMeta, setFinalizeMeta] = useState<{ durationSeconds?: number } | null>(null);
  const [lastDetectionConfidence, setLastDetectionConfidence] = useState(0);
  const [isBallDetected, setIsBallDetected] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [trackingMode, setTrackingMode] = useState<'yolo' | 'fallback' | 'checking'>('checking');
  const [frameIntervalMsInput, setFrameIntervalMsInput] = useState('60');

  const [metersPerPixelInput, setMetersPerPixelInput] = useState('');
  const [pitchPixelLengthInput, setPitchPixelLengthInput] = useState('');

  const metersPerPixel = useMemo(() => {
    const pitchPixelLength = Number(pitchPixelLengthInput);
    if (pitchPixelLength > 0) {
      return PITCH_LENGTH_METERS / pitchPixelLength;
    }
    const trimmed = metersPerPixelInput.trim();
    if (trimmed === '') return 0;
    const mpp = Number(trimmed);
    return mpp > 0 ? mpp : 0;
  }, [metersPerPixelInput, pitchPixelLengthInput]);

  const frameIntervalMs = useMemo(() => {
    const val = Number(frameIntervalMsInput);
    return val >= 20 ? val : 60;
  }, [frameIntervalMsInput]);

  const stopTrackingInterval = () => {
    trackingActiveRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
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
      const base64 = await cameraRef.current.captureBase64();

      if (!base64) {
        setStatusText('No frame data captured');
        return;
      }

      const response = await apiService.processBallSpeedFrame({
        session_id: sessionIdRef.current,
        image_base64: base64,
        meters_per_pixel: metersPerPixel,
        pitch_pixel_length: Number(pitchPixelLengthInput) || 0,
        frame_interval_ms: frameIntervalMs,
        confidence: 0.25,
        yolo_stride: 1,
      });

      if (!response.success || !response.data?.success) {
        setStatusText(response.error || response.data?.error || 'Ball speed processing failed');
        return;
      }

      const data = response.data;
      setTrackedFrames(Number(data.detected_frames) || 0);
      setTotalFrames(Number(data.total_frames) || 0);
      setLastDetectionConfidence(Number(data.detection_confidence) || 0);
      setIsBallDetected(Boolean(data.detected));
      setStatusText(data.detected ? 'Ball detected' : 'Tracking... ball not detected');
    } catch (error: any) {
      setStatusText(error?.message || 'Failed to capture/process frame');
    } finally {
      inFlightRef.current = false;
    }
  };

  const scheduleNextFrame = () => {
    if (!trackingActiveRef.current) return;
    pollTimeoutRef.current = setTimeout(async () => {
      if (!trackingActiveRef.current) return;
      const startedAt = Date.now();
      await processOneFrame();
      const elapsed = Date.now() - startedAt;
      const nextDelay = Math.max(0, frameIntervalMs - elapsed);
      if (trackingActiveRef.current) {
        scheduleNextFrameWithDelay(nextDelay);
      }
    }, 0);
  };

  const scheduleNextFrameWithDelay = (delayMs: number) => {
    if (!trackingActiveRef.current) return;
    pollTimeoutRef.current = setTimeout(async () => {
      if (!trackingActiveRef.current) return;
      const startedAt = Date.now();
      await processOneFrame();
      const elapsed = Date.now() - startedAt;
      const nextDelay = Math.max(0, frameIntervalMs - elapsed);
      if (trackingActiveRef.current) {
        scheduleNextFrameWithDelay(nextDelay);
      }
    }, delayMs);
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
    setFinalSpeedKmh(null);
    setFinalizeMeta(null);
    setTrackedFrames(0);
    setTotalFrames(0);
    setLastDetectionConfidence(0);
    setIsBallDetected(false);
    setStatusText('Ready');
    await endSession();
  };

  const startTracking = async () => {
    const mpp = Number.isFinite(metersPerPixel) ? metersPerPixel : 0;
    if (mpp <= 0) {
      Alert.alert(
        'Calibration required',
        'Enter the full pitch line width in pixels (distance between creases as it appears in the image), or enter meters per pixel. Do not skip this — wrong scale makes speed wrong by a large factor.',
      );
      return;
    }

    const sid = `bs_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    sessionIdRef.current = sid;
    setFinalSpeedKmh(null);
    setFinalizeMeta(null);
    setTrackedFrames(0);
    setTotalFrames(0);
    setStatusText('Initializing tracker...');
    const started = await apiService.startBallSpeedSession(sid);
    if (!started.success || !started.data?.success) {
      sessionIdRef.current = '';
      setStatusText(started.error || started.data?.error || 'Failed to start tracking session');
      Alert.alert('Could not start tracking', started.error || started.data?.error || 'Session init failed');
      return;
    }

    setIsTracking(true);
    trackingActiveRef.current = true;
    stopTrackingInterval();
    trackingActiveRef.current = true;
    scheduleNextFrame();
  };

  const pauseTracking = async () => {
    stopTrackingInterval();
    setIsTracking(false);
    setStatusText('Computing final speed...');

    if (!sessionIdRef.current) {
      setStatusText('Paused');
      return;
    }

    const finalize = await apiService.finalizeBallSpeedSession(sessionIdRef.current, {
      meters_per_pixel: metersPerPixel,
      pitch_pixel_length: Number(pitchPixelLengthInput) || 0,
      frame_interval_ms: frameIntervalMs,
    });

    if (!finalize.success || !finalize.data?.success) {
      setFinalSpeedKmh(null);
      setFinalizeMeta(null);
      const msg = finalize.error || finalize.data?.error || 'Could not compute final speed';
      setStatusText(msg);
      Alert.alert('Ball speed compute failed', msg);
      return;
    }

    setFinalSpeedKmh(Number(finalize.data.final_speed_kmh) || 0);
    setFinalizeMeta({ durationSeconds: Number(finalize.data.session_duration ?? finalize.data.duration_seconds) || 0 });
    setTrackedFrames(Number(finalize.data.detected_frames) || trackedFrames);
    setTotalFrames(Number(finalize.data.total_frames) || totalFrames);
    setStatusText('Final speed computed');
  };

  if (Platform.OS === 'web') {
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
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PremiumCard variant="outlined" padding="large" style={styles.card}>
          <Text style={[styles.title, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
            Live Ball Speed Checker
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
            Speed is calculated over the full tracked session and shown after you stop tracking.
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

        <View style={styles.actionsRow}>
          <PremiumButton
            title={isTracking ? 'Stop & Compute Speed' : 'Start Tracking'}
            onPress={isTracking ? pauseTracking : () => void startTracking()}
            variant="primary"
            size="medium"
          />
          <PremiumButton title="Reset" onPress={() => void resetTracker()} variant="secondary" size="medium" />
        </View>

        <PremiumCard variant="elevated" padding="medium" style={styles.card}>
          <View style={styles.cameraWrapper}>
            <BallSpeedCameraPreview ref={cameraRef} style={styles.camera} isActive />
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
            label="Pitch line width (pixels)"
            placeholder="e.g. measure crease-to-crease width in the photo"
            value={pitchPixelLengthInput}
            onChangeText={setPitchPixelLengthInput}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Or meters per pixel (if not using pitch width)"
            value={metersPerPixelInput}
            onChangeText={setMetersPerPixelInput}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Frame interval ms (sets timing for speed; match your capture loop)"
            value={frameIntervalMsInput}
            onChangeText={setFrameIntervalMsInput}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
          />
          <Text style={[styles.calibrationText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
            {metersPerPixel > 0
              ? `Active calibration: ${metersPerPixel.toFixed(6)} m/px`
              : 'Set pitch width (pixels) or meters per pixel before starting — required for correct speed.'}
          </Text>
        </PremiumCard>

        <PremiumCard variant="outlined" padding="large" style={styles.card}>
          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Final Session Speed</Text>
          <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
            {finalSpeedKmh === null ? '--' : `${finalSpeedKmh.toFixed(1)} km/h`}
          </Text>
          <Text style={[styles.smallStatusText, { color: theme.colors.onSurfaceVariant }]}>
            {statusText}
          </Text>

          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.md) }]}>
            Ball Detection
          </Text>
          <Text style={[styles.detectionText, { color: isBallDetected ? theme.colors.primary : theme.colors.error }]}>
            {isBallDetected ? `Detected (conf ${lastDetectionConfidence.toFixed(2)})` : 'Not detected'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.md) }]}>
            Tracked Frames
          </Text>
          <Text style={[styles.framesText, { color: theme.colors.onSurface }]}>
            {trackedFrames} / {totalFrames}
          </Text>
          {finalizeMeta?.durationSeconds !== undefined && (
            <>
              <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.md) }]}>
                Duration
              </Text>
              <Text style={[styles.framesText, { color: theme.colors.onSurface }]}>
                {finalizeMeta.durationSeconds.toFixed(2)} s
              </Text>
            </>
          )}
        </PremiumCard>
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
  framesText: {
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
  smallStatusText: {
    marginTop: getResponsiveSize(spacing.xs),
    fontSize: getResponsiveFontSize(12),
    fontWeight: '500',
  },
});
