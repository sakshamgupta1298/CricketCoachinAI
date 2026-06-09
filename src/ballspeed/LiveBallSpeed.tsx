/**
 * On-device, real-time ball-speed measurement.
 *
 * Films the delivery with vision-camera at the highest available frame rate,
 * runs the TFLite ball detector per frame (frameProcessor.ts), then on Stop
 * tracks the ball and computes speed from real frame timestamps (track.ts) and
 * the user's manually entered Distance(m). No upload — everything is local.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import { useSharedValue } from 'react-native-reanimated';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  useCameraPermission,
} from 'react-native-vision-camera';
import apiService from '../services/api';
import { borderRadius, spacing } from '../theme';
import type { Detection, SpeedResult } from './track';
import { estimateSpeed } from './track';
import { useBallSpeedFrameProcessor } from './frameProcessor';
import { MODEL_INPUT_SIZE, useBallDetector } from './useBallDetector';

const DEFAULT_DISTANCE_METERS = 20.12;

type Gate = 'checking' | 'allowed' | 'blocked';

export default function LiveBallSpeed() {
  const theme = useTheme();
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();
  const { model, isLoaded, error: modelError } = useBallDetector();

  // Prefer the highest frame rate the device can deliver (240 > 120 > 60).
  const format = useCameraFormat(device, [{ fps: 240 }]);
  const fps = Math.min(format?.maxFps ?? 60, 240);

  const capturing = useSharedValue(false);
  const detections = useSharedValue<Detection[]>([]);
  const sampleIndex = useSharedValue(0);
  const frameProcessor = useBallSpeedFrameProcessor(model, {
    capturing,
    detections,
    sampleIndex,
  });

  const [isCapturing, setIsCapturing] = useState(false);
  const [distanceInput, setDistanceInput] = useState('');
  const [result, setResult] = useState<SpeedResult | null>(null);
  const [gate, setGate] = useState<Gate>('checking');
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Gate the paid feature: on-device path never hits the server entitlement check.
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await apiService.getEntitlements();
      if (!alive) return;
      // Offline-friendly: only an explicit missing entitlement blocks; network errors allow use.
      if (!res.success) setGate('allowed');
      else setGate(res.data?.feature_ball_speed ? 'allowed' : 'blocked');
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission, requestPermission]);

  const getDistanceMeters = () => {
    const v = Number(distanceInput.trim());
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_DISTANCE_METERS;
  };

  const stop = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    capturing.value = false;
    setIsCapturing(false);

    // Bucket detections by sample frame for the tracker.
    const dets = detections.value;
    const byFrame = new Map<number, Detection[]>();
    for (const d of dets) {
      const arr = byFrame.get(d.frame) ?? [];
      arr.push(d);
      byFrame.set(d.frame, arr);
    }
    const perFrame = Array.from(byFrame.keys())
      .sort((a, b) => a - b)
      .map((k) => byFrame.get(k)!);

    setResult(estimateSpeed(perFrame, getDistanceMeters(), MODEL_INPUT_SIZE));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = useCallback(() => {
    setResult(null);
    detections.value = [];
    sampleIndex.value = 0;
    capturing.value = true;
    setIsCapturing(true);
    // Safety auto-stop: a delivery is over in well under 6s.
    autoStopRef.current = setTimeout(stop, 6000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop]);

  const muted = theme.colors.onSurfaceVariant;

  if (gate === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={{ color: muted }}>Checking your plan…</Text>
      </View>
    );
  }
  if (gate === 'blocked') {
    return (
      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Ball Speed is a Pro feature</Text>
        <Text style={[styles.muted, { color: muted }]}>Upgrade your plan to measure ball speed on-device.</Text>
      </View>
    );
  }
  if (modelError) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { color: muted }]}>Ball detector failed to load. Reinstall the app build.</Text>
      </View>
    );
  }
  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { color: muted }]}>No camera available on this device.</Text>
      </View>
    );
  }
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { color: muted }]}>Camera permission is required to measure ball speed.</Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          label="Distance (m)"
          value={distanceInput}
          onChangeText={setDistanceInput}
          keyboardType="decimal-pad"
          mode="outlined"
          placeholder={`${DEFAULT_DISTANCE_METERS}`}
          style={styles.input}
          dense
        />
        <Text style={[styles.fpsBadge, { color: muted }]}>{fps} fps</Text>
      </View>

      <View style={styles.cameraWrap}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          fps={fps}
          isActive={true}
          frameProcessor={isLoaded ? frameProcessor : undefined}
        />
        {!isLoaded && (
          <View style={styles.cameraOverlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.overlayText}>Loading detector…</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: isCapturing ? '#c62828' : theme.colors.primary }]}
        onPress={isCapturing ? stop : start}
        disabled={!isLoaded}
      >
        <Text style={styles.buttonText}>{isCapturing ? 'Stop' : 'Measure delivery'}</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.result}>
          {result.success ? (
            <>
              <Text style={[styles.speed, { color: theme.colors.onSurface }]}>
                {result.speedKmh?.toFixed(1)} km/h
              </Text>
              <Text style={[styles.muted, { color: muted }]}>
                {result.timeSec?.toFixed(3)}s over {getDistanceMeters()} m · {result.trackPoints} points ·
                confidence: {result.confidence}
              </Text>
            </>
          ) : (
            <Text style={[styles.muted, { color: muted }]}>{result.note}</Text>
          )}
          {result.success && result.note ? <Text style={styles.warn}>{result.note}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  center: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: { flex: 1, backgroundColor: 'transparent' },
  fpsBadge: { fontVariant: ['tabular-nums'] },
  cameraWrap: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  overlayText: { color: '#fff' },
  button: { paddingVertical: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  result: { alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
  speed: { fontSize: 36, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '700' },
  muted: { textAlign: 'center' },
  warn: { color: '#e67e22', textAlign: 'center' },
});
