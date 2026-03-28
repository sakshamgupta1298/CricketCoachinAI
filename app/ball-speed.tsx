import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumButton } from '../src/components/ui/PremiumButton';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import apiService from '../src/services/api';
import { borderRadius, spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

const PITCH_LENGTH_METERS = 20.12;
const DEFAULT_STRIKER_RATIO = 0.62;

export default function BallSpeedScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const sessionIdRef = useRef<string>('');

  const [isTracking, setIsTracking] = useState(false);
  const [finalSpeedKmh, setFinalSpeedKmh] = useState<number | null>(null);
  const [trackedFrames, setTrackedFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [finalizeMeta, setFinalizeMeta] = useState<{
    durationSeconds?: number;
    usedBounceFallback?: boolean;
    releaseDetected?: boolean;
    bounceDetected?: boolean;
    reachDetected?: boolean;
  } | null>(null);
  const [lastDetectionConfidence, setLastDetectionConfidence] = useState(0);
  const [isBallDetected, setIsBallDetected] = useState(false);
  const [statusText, setStatusText] = useState('Ready');
  const [trackingMode, setTrackingMode] = useState<'yolo' | 'fallback' | 'checking'>('checking');
  const [frameIntervalMsInput, setFrameIntervalMsInput] = useState('66');
  const [strikerZoneRatioInput, setStrikerZoneRatioInput] = useState(String(DEFAULT_STRIKER_RATIO));
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [metersPerPixelInput, setMetersPerPixelInput] = useState('0.015');
  const [pitchPixelLengthInput, setPitchPixelLengthInput] = useState('');

  const [liveSpeedKmh, setLiveSpeedKmh] = useState(0);
  const [releaseDetected, setReleaseDetected] = useState(false);
  const [bounceDetected, setBounceDetected] = useState(false);
  const [reachDetected, setReachDetected] = useState(false);
  const [legacyPixelSpeedKmh, setLegacyPixelSpeedKmh] = useState(0);

  const metersPerPixel = useMemo(() => {
    const pitchPixelLength = Number(pitchPixelLengthInput);
    if (pitchPixelLength > 0) {
      return PITCH_LENGTH_METERS / pitchPixelLength;
    }
    const mpp = Number(metersPerPixelInput);
    return mpp > 0 ? mpp : 0.015;
  }, [metersPerPixelInput, pitchPixelLengthInput]);

  const strikerZoneRatio = useMemo(() => {
    const v = Number(strikerZoneRatioInput);
    if (Number.isFinite(v) && v >= 0.05 && v <= 0.95) {
      return v;
    }
    return DEFAULT_STRIKER_RATIO;
  }, [strikerZoneRatioInput]);

  const frameIntervalMs = useMemo(() => {
    const val = Number(frameIntervalMsInput);
    if (!Number.isFinite(val) || val < 50 || val > 500) {
      return 66;
    }
    return Math.round(val);
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
        timestamp: Date.now(),
        frame_interval_ms: frameIntervalMs,
        meters_per_pixel: metersPerPixel,
        pitch_pixel_length: Number(pitchPixelLengthInput) || 0,
        confidence: 0.25,
        striker_zone_x_ratio: strikerZoneRatio,
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
      setLiveSpeedKmh(Number(data.speed_kmh) || 0);
      setReleaseDetected(Boolean(data.release_detected));
      setBounceDetected(Boolean(data.bounce_detected));
      setReachDetected(Boolean(data.reach_detected));
      setLegacyPixelSpeedKmh(Number(data.smoothed_speed_kmh) || 0);

      if (data.detected) {
        setStatusText('Ball detected — building release → reach timing');
      } else {
        setStatusText('Point the camera at the ball path (bowler → striker)');
      }
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
    setFinalSpeedKmh(null);
    setFinalizeMeta(null);
    setTrackedFrames(0);
    setTotalFrames(0);
    setLastDetectionConfidence(0);
    setIsBallDetected(false);
    setLiveSpeedKmh(0);
    setReleaseDetected(false);
    setBounceDetected(false);
    setReachDetected(false);
    setLegacyPixelSpeedKmh(0);
    setStatusText('Ready');
    await endSession();
  };

  const startTracking = async () => {
    const sid = `bs_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    sessionIdRef.current = sid;
    setFinalSpeedKmh(null);
    setFinalizeMeta(null);
    setTrackedFrames(0);
    setTotalFrames(0);
    setLiveSpeedKmh(0);
    setReleaseDetected(false);
    setBounceDetected(false);
    setReachDetected(false);
    setLegacyPixelSpeedKmh(0);
    setStatusText('Starting session...');
    const started = await apiService.startBallSpeedSession(sid);
    if (!started.success || !started.data?.success) {
      sessionIdRef.current = '';
      setStatusText(started.error || started.data?.error || 'Failed to start tracking session');
      Alert.alert('Could not start tracking', started.error || started.data?.error || 'Session init failed');
      return;
    }

    setIsTracking(true);
    stopTrackingInterval();

    void processOneFrame();
    pollIntervalRef.current = setInterval(() => {
      void processOneFrame();
    }, frameIntervalMs);
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
    });

    if (!finalize.success || !finalize.data?.success) {
      setFinalSpeedKmh(null);
      setFinalizeMeta(null);
      const msg = finalize.error || finalize.data?.error || 'Could not compute final speed';
      setStatusText(msg);
      Alert.alert('Ball speed compute failed', msg);
      return;
    }

    const fd = finalize.data;
    setFinalSpeedKmh(Number(fd.final_speed_kmh) || 0);
    setFinalizeMeta({
      durationSeconds: Number(fd.duration_seconds) || 0,
      usedBounceFallback: Boolean(fd.used_bounce_fallback),
      releaseDetected: Boolean(fd.release_detected),
      bounceDetected: Boolean(fd.bounce_detected),
      reachDetected: Boolean(fd.reach_detected),
    });
    setTrackedFrames(Number(fd.detected_frames) || trackedFrames);
    setTotalFrames(Number(fd.total_frames) || totalFrames);
    setStatusText('Final speed computed');
  };

  const pillColor = (active: boolean) =>
    active ? theme.colors.primaryContainer : theme.colors.surfaceVariant;
  const pillOnColor = (active: boolean) =>
    active ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;

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
            Camera access is required for timing-based ball speed.
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
            Timing-based ball speed
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
            Speed uses a fixed 17.68 m pitch segment and the time from detected release to when the ball crosses
            your striker line (frame position). Use a side-on view along the pitch for best results.
          </Text>
          <Text style={[styles.modeText, { color: theme.colors.onSurfaceVariant }]}>
            Ball detector:{' '}
            {trackingMode === 'checking'
              ? 'Checking...'
              : trackingMode === 'yolo'
                ? 'YOLO (recommended)'
                : 'Contour fallback'}
          </Text>
        </PremiumCard>

        <View style={styles.actionsRow}>
          <PremiumButton
            title={isTracking ? 'Stop & finalize' : 'Start session'}
            onPress={isTracking ? () => void pauseTracking() : () => void startTracking()}
            variant="primary"
            size="medium"
          />
          <PremiumButton title="Reset" onPress={() => void resetTracker()} variant="secondary" size="medium" />
        </View>

        <PremiumCard variant="elevated" padding="medium" style={styles.card}>
          <View style={styles.cameraWrapper}>
            <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            <View style={styles.overlayPanel}>
              <Text style={[styles.overlayText, { color: '#FFFFFF' }]}>
                {isTracking ? 'Sending frames + timestamps' : 'Tap Start session'}
              </Text>
              <Text style={[styles.overlaySubText, { color: '#FFFFFF' }]}>{statusText}</Text>
              {isTracking && liveSpeedKmh > 0 && (
                <Text style={[styles.overlayLiveSpeed, { color: '#FFFFFF' }]}>
                  Live median: {liveSpeedKmh.toFixed(1)} km/h
                </Text>
              )}
            </View>
          </View>
        </PremiumCard>

        <PremiumCard variant="elevated" padding="large" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Session timing</Text>
          <View style={styles.pillRow}>
            <View style={[styles.pill, { backgroundColor: pillColor(releaseDetected) }]}>
              <Text style={[styles.pillText, { color: pillOnColor(releaseDetected) }]}>Release</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: pillColor(bounceDetected) }]}>
              <Text style={[styles.pillText, { color: pillOnColor(bounceDetected) }]}>Bounce</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: pillColor(reachDetected) }]}>
              <Text style={[styles.pillText, { color: pillOnColor(reachDetected) }]}>Striker</Text>
            </View>
          </View>
          <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
            Release uses the Kalman-smoothed path: low-motion frames, then a spike vs recent motion, with movement
            toward the striker where horizontal motion dominates vertical ({'|dx| > |dy|'}). Striker = past your line
            for several frames with the same dominance and direction (e.g. positive dx when the striker is to the
            right). The server also requires a minimum horizontal pixel travel between release and first reach.
          </Text>

          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.md) }]}>
            Ball in frame
          </Text>
          <Text style={[styles.detectionText, { color: isBallDetected ? theme.colors.primary : theme.colors.error }]}>
            {isBallDetected ? `Yes · conf ${lastDetectionConfidence.toFixed(2)}` : 'No'}
          </Text>
          <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.sm) }]}>
            Frames with detection
          </Text>
          <Text style={[styles.framesText, { color: theme.colors.onSurface }]}>
            {trackedFrames} / {totalFrames}
          </Text>
        </PremiumCard>

        <PremiumCard variant="elevated" padding="large" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Setup</Text>
          <TextInput
            label="Frame interval (ms, 50–80 recommended)"
            value={frameIntervalMsInput}
            onChangeText={setFrameIntervalMsInput}
            keyboardType="number-pad"
            mode="outlined"
            style={styles.input}
          />
          <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
            About 50–80 ms ≈ 12–20 FPS. Shorter intervals improve release→striker timing (more CPU, network, and
            battery use). Values below 50 ms or above 500 ms fall back to 66 ms.
          </Text>
          <TextInput
            label="Striker line (0–1 across width)"
            value={strikerZoneRatioInput}
            onChangeText={setStrikerZoneRatioInput}
            keyboardType="decimal-pad"
            mode="outlined"
            style={styles.input}
          />
          <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>
            Where the ball is treated as having reached the striker: 0 = left edge, 1 = right. Increase if your
            striker is farther right in frame.
          </Text>
        </PremiumCard>

        <PremiumCard variant="outlined" padding="large" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>Final speed</Text>
          <Text style={[styles.metricValue, { color: theme.colors.onSurface }]}>
            {finalSpeedKmh === null ? '—' : `${finalSpeedKmh.toFixed(1)} km/h`}
          </Text>
          <Text style={[styles.smallStatusText, { color: theme.colors.onSurfaceVariant }]}>{statusText}</Text>
          {finalizeMeta?.usedBounceFallback && (
            <Text style={[styles.fallbackNote, { color: theme.colors.tertiary }]}>
              Estimated using bounce timing (striker crossing not detected).
            </Text>
          )}
          {finalizeMeta != null &&
            (finalizeMeta.releaseDetected != null || finalizeMeta.durationSeconds !== undefined) && (
              <>
                <Text style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.md) }]}>
                  Last finalize — events detected
                </Text>
                <Text style={[styles.framesText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(14) }]}>
                  Release {finalizeMeta.releaseDetected ? '✓' : '—'} · Bounce {finalizeMeta.bounceDetected ? '✓' : '—'} ·
                  Striker {finalizeMeta.reachDetected ? '✓' : '—'}
                </Text>
                {(finalizeMeta.durationSeconds ?? 0) > 0 && (
                  <>
                    <Text
                      style={[
                        styles.metricLabel,
                        { color: theme.colors.onSurfaceVariant, marginTop: getResponsiveSize(spacing.sm) },
                      ]}
                    >
                      Last flight window (when available)
                    </Text>
                    <Text style={[styles.framesText, { color: theme.colors.onSurface }]}>
                      {(finalizeMeta.durationSeconds ?? 0).toFixed(2)} s
                    </Text>
                  </>
                )}
              </>
            )}
        </PremiumCard>

        <Pressable
          onPress={() => setShowAdvanced((v) => !v)}
          style={({ pressed }) => [styles.advancedToggle, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.advancedToggleText, { color: theme.colors.primary }]}>
            {showAdvanced ? 'Hide advanced' : 'Advanced (legacy reference speed)'}
          </Text>
        </Pressable>

        {showAdvanced && (
          <PremiumCard variant="outlined" padding="large" style={styles.card}>
            <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant, marginBottom: getResponsiveSize(spacing.sm) }]}>
              Optional. Used only for the secondary pixel-based smoothed readout the API still returns — not for the
              main 17.68 m timing speed.
            </Text>
            <TextInput
              label="Meters per pixel"
              value={metersPerPixelInput}
              onChangeText={setMetersPerPixelInput}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Pitch length in pixels (optional)"
              value={pitchPixelLengthInput}
              onChangeText={setPitchPixelLengthInput}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.input}
            />
            <Text style={[styles.calibrationText, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
              Reference calibration: {metersPerPixel.toFixed(6)} m/px · Smoothed pixel estimate:{' '}
              {legacyPixelSpeedKmh > 0 ? `${legacyPixelSpeedKmh.toFixed(1)} km/h` : '—'}
            </Text>
          </PremiumCard>
        )}
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
    paddingBottom: getResponsiveSize(spacing.xxl),
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
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.sm),
  },
  modeText: {
    marginTop: getResponsiveSize(spacing.sm),
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
    right: getResponsiveSize(spacing.sm),
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
  overlayLiveSpeed: {
    marginTop: getResponsiveSize(4),
    fontSize: getResponsiveFontSize(13),
    fontWeight: '700',
  },
  input: {
    marginBottom: getResponsiveSize(spacing.sm),
  },
  helperText: {
    fontSize: getResponsiveFontSize(12),
    lineHeight: getResponsiveSize(17),
    marginBottom: getResponsiveSize(spacing.sm),
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSize(spacing.xs),
    marginBottom: getResponsiveSize(spacing.sm),
  },
  pill: {
    paddingHorizontal: getResponsiveSize(spacing.sm),
    paddingVertical: getResponsiveSize(6),
    borderRadius: borderRadius.md,
  },
  pillText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '700',
  },
  fallbackNote: {
    marginTop: getResponsiveSize(spacing.sm),
    fontSize: getResponsiveFontSize(12),
    fontStyle: 'italic',
  },
  advancedToggle: {
    marginBottom: getResponsiveSize(spacing.md),
    paddingVertical: getResponsiveSize(spacing.xs),
  },
  advancedToggleText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
});
