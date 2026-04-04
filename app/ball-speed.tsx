import Slider from '@react-native-community/slider';
import { ResizeMode, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumCard } from '../src/components/ui/PremiumCard';
import { borderRadius, colors, spacing } from '../src/theme';
import { getResponsiveFontSize, getResponsiveSize } from '../src/utils/responsive';

const DEFAULT_DISTANCE_METERS = 20.12;
const DEFAULT_FPS = 30;

export default function BallSpeedScreen() {
  const theme = useTheme();
  const videoRef = useRef<Video>(null);

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [positionMs, setPositionMs] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const wasPlayingBeforeScrubRef = useRef(false);

  const [releaseFrame, setReleaseFrame] = useState<number | null>(null);
  const [arrivalFrame, setArrivalFrame] = useState<number | null>(null);
  const [timeTakenSec, setTimeTakenSec] = useState<number | null>(null);
  const [distanceMetersInput, setDistanceMetersInput] = useState<string>('');
  const [fpsInput, setFpsInput] = useState<string>('');
  const [speedKmh, setSpeedKmh] = useState<number | null>(null);

  const getDisplayedSeconds = (seconds: number) => {
    const decimals = seconds < 10 ? 2 : 1;
    const factor = Math.pow(10, decimals);
    return Math.round(seconds * factor) / factor;
  };

  const formatElapsedSeconds = useMemo(() => {
    return (seconds: number) => {
      const displayedSeconds = getDisplayedSeconds(seconds);
      const decimals = displayedSeconds < 10 ? 2 : 1;
      return `${displayedSeconds.toFixed(decimals)}s`;
    };
  }, []);

  const getFps = () => {
    const raw = fpsInput.trim();
    if (!raw) return DEFAULT_FPS;
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0) return DEFAULT_FPS;
    return v;
  };

  const getDistanceMeters = () => {
    const raw = distanceMetersInput.trim();
    if (!raw) return DEFAULT_DISTANCE_METERS;
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0) return DEFAULT_DISTANCE_METERS;
    return v;
  };

  const resetComputed = () => {
    setTimeTakenSec(null);
    setSpeedKmh(null);
  };

  const computeFromFrames = useCallback((release: number, arrival: number) => {
    const fps = getFps();
    const deltaFrames = Math.max(0, arrival - release);
    const elapsedSecondsRaw = deltaFrames / fps;
    setTimeTakenSec(elapsedSecondsRaw);

    const distanceMeters = getDistanceMeters();
    const elapsedSeconds = getDisplayedSeconds(elapsedSecondsRaw);
    if (elapsedSeconds > 0) {
      const mps = distanceMeters / elapsedSeconds;
      setSpeedKmh(mps * 3.6);
    } else {
      setSpeedKmh(null);
    }
  }, [distanceMetersInput, fpsInput]);

  const markRelease = () => {
    if (!videoUri) return;
    const fps = getFps();
    const frame = Math.max(0, Math.round((positionMs / 1000) * fps));
    setReleaseFrame(frame);
    resetComputed();
    if (arrivalFrame != null) computeFromFrames(frame, arrivalFrame);
  };

  const markArrival = () => {
    if (!videoUri) return;
    const fps = getFps();
    const frame = Math.max(0, Math.round((positionMs / 1000) * fps));
    setArrivalFrame(frame);
    resetComputed();
    if (releaseFrame != null) computeFromFrames(releaseFrame, frame);
  };

  const changePlaybackRate = async (rate: number) => {
    setPlaybackRate(rate);
    if (!isPlaying) return;
    try {
      await videoRef.current?.setRateAsync(rate, false);
    } catch {
      // ignore
    }
  };

  const onResetAll = useCallback(async () => {
    setVideoUri(null);
    setDurationMs(0);
    setPositionMs(0);
    setIsPlaying(false);
    setIsScrubbing(false);
    setReleaseFrame(null);
    setArrivalFrame(null);
    setTimeTakenSec(null);
    setSpeedKmh(null);
    try {
      await videoRef.current?.unloadAsync();
    } catch {
      // ignore
    }
  }, []);

  const hasComputed = speedKmh != null && timeTakenSec != null;
  const fps = getFps();
  const releaseSec = releaseFrame != null ? releaseFrame / fps : null;
  const arrivalSec = arrivalFrame != null ? arrivalFrame / fps : null;
  const deltaFrames = releaseFrame != null && arrivalFrame != null ? Math.max(0, arrivalFrame - releaseFrame) : null;

  const statusText = !videoUri
    ? 'Pick or record a bowling video to begin'
    : releaseFrame == null
      ? 'Scrub to the frame where ball leaves hand, then tap “Mark release”'
      : arrivalFrame == null
        ? 'Scrub to the frame where ball reaches batsman, then tap “Mark arrival”'
        : hasComputed
          ? 'Computed — adjust marks to recompute'
          : 'Ready to compute';

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your media library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await onResetAll();
        setVideoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Error picking video:', e);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const recordVideo = async () => {
    try {
      const camPerm = await ImagePicker.requestCameraPermissionsAsync();
      if (camPerm.status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permission to record a video.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        quality: 1,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        await onResetAll();
        setVideoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Error recording video:', e);
      Alert.alert('Error', 'Failed to record video. Please try again.');
    }
  };

  const togglePlay = async () => {
    if (!videoUri) return;
    try {
      if (isPlaying) {
        await videoRef.current?.pauseAsync();
      } else {
        await videoRef.current?.setRateAsync(playbackRate, false);
        await videoRef.current?.playAsync();
      }
    } catch {
      // ignore
    }
  };

  const onScrubStart = async () => {
    wasPlayingBeforeScrubRef.current = isPlaying;
    setIsScrubbing(true);
    try {
      await videoRef.current?.pauseAsync();
    } catch {
      // ignore
    }
  };

  const onScrubComplete = async (ms: number) => {
    setIsScrubbing(false);
    try {
      await videoRef.current?.setPositionAsync(ms);
      if (wasPlayingBeforeScrubRef.current) {
        await videoRef.current?.setRateAsync(playbackRate, false);
        await videoRef.current?.playAsync();
      }
    } catch {
      // ignore
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Animated.View entering={FadeInDown.delay(80).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              Ball Speed from Video Frames
            </Text>
            <Text style={[styles.headerSub, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(13) }]}>
              Mark the release and arrival frames, then compute time and speed.
            </Text>
          </PremiumCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(140).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.cameraCard}>
            <View style={styles.cameraHeader}>
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={pickVideo}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.controlButtonText, { fontSize: getResponsiveFontSize(14) }]}>
                    Pick video
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    { backgroundColor: theme.colors.secondary },
                  ]}
                  onPress={recordVideo}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.resetButtonText,
                      { color: 'white', fontSize: getResponsiveFontSize(14) },
                    ]}
                  >
                    Record
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.distanceRow}>
                <View style={styles.distanceInputWrap}>
                  <TextInput
                    label="Distance (m)"
                    value={distanceMetersInput}
                    onChangeText={setDistanceMetersInput}
                    keyboardType="decimal-pad"
                    mode="outlined"
                    placeholder={`${DEFAULT_DISTANCE_METERS}`}
                    style={styles.distanceInput}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    dense
                  />
                </View>
                <View style={styles.distanceInputWrap}>
                  <TextInput
                    label="FPS"
                    value={fpsInput}
                    onChangeText={setFpsInput}
                    keyboardType="number-pad"
                    mode="outlined"
                    placeholder={`${DEFAULT_FPS}`}
                    style={styles.distanceInput}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    dense
                  />
                </View>
                <View style={styles.metaWrap}>
                  <Text style={[styles.inlineMetaLabel, { color: theme.colors.onSurfaceVariant }]}>Speed</Text>
                  <Text style={[styles.inlineMetaValue, { color: theme.colors.onSurface }]}>
                    {speedKmh != null ? `${speedKmh.toFixed(1)} km/h` : '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.cameraWrapper}>
              {videoUri ? (
                <Video
                  ref={videoRef}
                  source={{ uri: videoUri }}
                  style={styles.camera}
                  resizeMode={ResizeMode.CONTAIN}
                  useNativeControls={false}
                  shouldPlay={false}
                  onLoad={(status) => {
                    // expo-av types vary; durationMillis exists at runtime.
                    const d = (status as any)?.durationMillis;
                    setDurationMs(typeof d === 'number' ? d : 0);
                  }}
                  onPlaybackStatusUpdate={(status) => {
                    if (!(status as any)?.isLoaded) return;
                    const pos = (status as any)?.positionMillis;
                    const playing = (status as any)?.isPlaying;
                    if (!isScrubbing && typeof pos === 'number') setPositionMs(pos);
                    if (typeof playing === 'boolean') setIsPlaying(playing);
                  }}
                />
              ) : (
                <View style={styles.emptyVideo}>
                  <Text style={[styles.emptyVideoText, { fontSize: getResponsiveFontSize(14) }]}>
                    Select a bowling video to mark frames.
                  </Text>
                  <Text style={[styles.emptyVideoSubText, { fontSize: getResponsiveFontSize(12) }]}>
                    Tip: record at 60/120 fps for best accuracy.
                  </Text>
                </View>
              )}
              <View style={styles.overlayPanel}>
                <Text style={styles.overlayText}>{statusText}</Text>
                <Text style={styles.overlaySubText}>
                  {videoUri
                    ? `${formatTime(positionMs)} / ${formatTime(durationMs)}${isPlaying ? ` • ${playbackRate}x` : ''}`
                    : 'Ready'}
                </Text>
              </View>
            </View>

            {videoUri && (
              <View style={styles.scrubPanel}>
                <View style={styles.scrubTopRow}>
                  <TouchableOpacity
                    style={[styles.smallButton, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                    onPress={togglePlay}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.smallButtonText, { color: theme.colors.onSurface }]}>
                      {isPlaying ? 'Pause' : 'Play'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}
                    onPress={onResetAll}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.smallButtonText, { color: theme.colors.onSurface }]}>Clear</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.rateRow}>
                  <TouchableOpacity
                    style={[
                      styles.smallButton,
                      playbackRate === 1 ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                    ]}
                    onPress={() => changePlaybackRate(1)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.smallButtonText, { color: playbackRate === 1 ? 'white' : theme.colors.onSurface }]}>1x</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.smallButton,
                      playbackRate === 0.5 ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                    ]}
                    onPress={() => changePlaybackRate(0.5)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.smallButtonText, { color: playbackRate === 0.5 ? 'white' : theme.colors.onSurface }]}>0.5x</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.smallButton,
                      playbackRate === 0.25 ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface },
                    ]}
                    onPress={() => changePlaybackRate(0.25)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.smallButtonText, { color: playbackRate === 0.25 ? 'white' : theme.colors.onSurface }]}>0.25x</Text>
                  </TouchableOpacity>
                </View>

                <Slider
                  value={positionMs}
                  minimumValue={0}
                  maximumValue={Math.max(1, durationMs)}
                  onSlidingStart={onScrubStart}
                  onSlidingComplete={onScrubComplete}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.outline}
                  thumbTintColor={theme.colors.primary}
                />

                <View style={styles.markRow}>
                  <TouchableOpacity
                    style={[styles.markButton, { backgroundColor: theme.colors.primary }]}
                    onPress={markRelease}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.markButtonText}>Mark release</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.markButton, { backgroundColor: theme.colors.secondary }]}
                    onPress={markArrival}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.markButtonText}>Mark arrival</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.marksMeta}>
                  <View style={styles.markMetaCol}>
                    <Text style={[styles.inlineMetaLabel, { color: theme.colors.onSurfaceVariant }]}>Release</Text>
                    <Text style={[styles.inlineMetaValue, { color: theme.colors.onSurface }]}>
                      {releaseFrame != null && releaseSec != null ? `f${releaseFrame} (${releaseSec.toFixed(3)}s)` : '—'}
                    </Text>
                  </View>
                  <View style={styles.markMetaCol}>
                    <Text style={[styles.inlineMetaLabel, { color: theme.colors.onSurfaceVariant }]}>Arrival</Text>
                    <Text style={[styles.inlineMetaValue, { color: theme.colors.onSurface }]}>
                      {arrivalFrame != null && arrivalSec != null ? `f${arrivalFrame} (${arrivalSec.toFixed(3)}s)` : '—'}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultRow}>
                  <View style={styles.markMetaCol}>
                    <Text style={[styles.inlineMetaLabel, { color: theme.colors.onSurfaceVariant }]}>Δ Frames</Text>
                    <Text style={[styles.inlineMetaValue, { color: theme.colors.onSurface }]}>
                      {deltaFrames != null ? `${deltaFrames}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.markMetaCol}>
                    <Text style={[styles.inlineMetaLabel, { color: theme.colors.onSurfaceVariant }]}>Time</Text>
                    <Text style={[styles.inlineMetaValue, { color: theme.colors.onSurface }]}>
                      {timeTakenSec != null ? formatElapsedSeconds(timeTakenSec) : '—'}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </PremiumCard>

          <TouchableOpacity style={styles.backButtonRow} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={[styles.backLink, { color: theme.colors.primary }]}>Back</Text>
          </TouchableOpacity>
        </Animated.View>
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
    paddingBottom: getResponsiveSize(spacing.xl),
  },
  card: {
    marginBottom: getResponsiveSize(spacing.lg),
  },
  headerTitle: {
    fontWeight: '800',
    marginBottom: getResponsiveSize(spacing.xs),
  },
  headerSub: {
    lineHeight: getResponsiveSize(18),
  },
  modeText: {
    marginTop: getResponsiveSize(spacing.sm),
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(spacing.sm),
  },
  cameraHeader: {
    marginBottom: getResponsiveSize(spacing.md),
  },
  distanceRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(spacing.sm),
    alignItems: 'flex-end',
    marginTop: getResponsiveSize(spacing.sm),
  },
  distanceInputWrap: {
    flex: 1,
  },
  metaWrap: {
    minWidth: getResponsiveSize(110),
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingBottom: getResponsiveSize(4),
  },
  distanceInput: {
    marginBottom: getResponsiveSize(spacing.xs),
  },
  distanceHelp: {
    fontSize: getResponsiveFontSize(12),
    marginBottom: getResponsiveSize(spacing.md),
    fontWeight: '600',
  },
  controlButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: getResponsiveSize(spacing.md),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(44),
  },
  controlButtonText: {
    color: 'white',
    fontWeight: '800',
  },
  resetButtonText: {
    fontWeight: '800',
  },
  inlineMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: getResponsiveSize(spacing.md),
    alignItems: 'center',
  },
  inlineMetaLabel: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  inlineMetaValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '800',
  },
  cameraCard: {
    marginBottom: getResponsiveSize(spacing.lg),
  },
  cameraWrapper: {
    height: getResponsiveSize(420),
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.gray[900],
  },
  camera: {
    flex: 1,
  },
  emptyVideo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveSize(spacing.lg),
    backgroundColor: colors.gray[900],
  },
  emptyVideoText: {
    color: 'white',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: getResponsiveSize(spacing.xs),
  },
  emptyVideoSubText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.85,
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
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: getResponsiveFontSize(14),
  },
  overlaySubText: {
    marginTop: getResponsiveSize(2),
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  backButtonRow: {
    alignItems: 'center',
    paddingVertical: getResponsiveSize(spacing.xs),
  },
  backLink: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '800',
  },
  scrubPanel: {
    marginTop: getResponsiveSize(spacing.md),
  },
  scrubTopRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(spacing.sm),
    marginBottom: getResponsiveSize(spacing.sm),
  },
  rateRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(spacing.sm),
    marginBottom: getResponsiveSize(spacing.sm),
  },
  smallButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingVertical: getResponsiveSize(spacing.sm),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(40),
  },
  smallButtonText: {
    fontWeight: '800',
    fontSize: getResponsiveFontSize(13),
  },
  markRow: {
    flexDirection: 'row',
    gap: getResponsiveSize(spacing.sm),
    marginTop: getResponsiveSize(spacing.sm),
  },
  markButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: getResponsiveSize(spacing.md),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(44),
  },
  markButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: getResponsiveFontSize(14),
  },
  marksMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(spacing.sm),
    marginTop: getResponsiveSize(spacing.md),
  },
  markMetaCol: {
    flex: 1,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: getResponsiveSize(spacing.sm),
    marginTop: getResponsiveSize(spacing.sm),
  },
});
