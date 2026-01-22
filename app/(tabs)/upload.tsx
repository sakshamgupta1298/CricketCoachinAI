import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Menu, RadioButton, Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import AnalysisScreen from '../../src/components/AnalysisScreen';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { useUpload } from '../../src/context/UploadContext';
import apiService from '../../src/services/api';
import { borderRadius, colors, spacing } from '../../src/theme';
import { BowlerType, PlayerSide, PlayerType, UploadFormData } from '../../src/types';
import { getResponsiveSize, getResponsiveFontSize } from '../../src/utils/responsive';

export default function UploadScreen() {
  const theme = useTheme();
  const { isUploading, progress, startUpload, updateProgress, completeUpload } = useUpload();

  const [playerType, setPlayerType] = useState<PlayerType>('batsman');
  const [playerSide, setPlayerSide] = useState<PlayerSide>('right');
  const [bowlerType, setBowlerType] = useState<BowlerType>('fast_bowler');
  const [shotType, setShotType] = useState<string>('');
  const [customShotType, setCustomShotType] = useState<string>('');
  const [shotTypeMenuVisible, setShotTypeMenuVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    uri: string;
    name: string;
    size: number;
    type: string;
  } | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'uploading' | 'processing' | 'analyzing'>('uploading');

  // Update analysis status based on progress
  useEffect(() => {
    if (isUploading) {
      if (progress < 33) {
        setAnalysisStatus('uploading');
      } else if (progress < 66) {
        setAnalysisStatus('processing');
      } else {
        setAnalysisStatus('analyzing');
      }
    }
  }, [isUploading, progress]);

  // Major cricket batting shots
  const majorShots = [
    'cover_drive',
    'pull_shot',
    'cut_shot',
    'straight_drive',
    'sweep_shot',
    'other'
  ];

  const getShotDisplayName = (shot: string) => {
    const displayNames: Record<string, string> = {
      'cover_drive': 'Cover Drive',
      'pull_shot': 'Pull Shot',
      'cut_shot': 'Cut Shot',
      'straight_drive': 'Straight Drive',
      'sweep_shot': 'Sweep Shot',
      'other': 'Other'
    };
    return displayNames[shot] || shot.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Reset shot type when player type changes
  React.useEffect(() => {
    if (playerType !== 'batsman') {
      setShotType('');
      setCustomShotType('');
    }
  }, [playerType]);

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your media library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileInfo = await apiService.getFileInfo(asset.uri);
        const validation = apiService.validateVideoFile(asset.uri, fileInfo.size);

        if (!validation.isValid) {
          Alert.alert('Invalid Video', validation.error);
          return;
        }

        setSelectedVideo({
          uri: asset.uri,
          name: asset.fileName || 'video.mp4',
          size: fileInfo.size,
          type: fileInfo.type,
        });
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'Failed to pick video. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedVideo) {
      Alert.alert('No Video Selected', 'Please select a video first.');
      return;
    }

    try {
      const formData: UploadFormData = {
        player_type: playerType,
        video_uri: selectedVideo.uri,
        video_name: selectedVideo.name,
        video_size: selectedVideo.size,
        video_type: selectedVideo.type,
      };

      if (playerType === 'batsman') {
        formData.batter_side = playerSide;
        // Only include shot_type if user selected one (not empty)
        // If shot_type is provided, backend will skip auto-detection
        if (shotType && shotType !== '') {
          if (shotType === 'other' && customShotType.trim()) {
            formData.shot_type = customShotType.trim().toLowerCase().replace(/\s+/g, '_');
          } else if (shotType !== 'other') {
            formData.shot_type = shotType;
          }
        }
        // If shotType is empty, backend will auto-detect
        console.log('📋 [UPLOAD] Shot type being sent:', formData.shot_type || 'AUTO-DETECT');
      } else {
        formData.bowler_side = playerSide;
        formData.bowler_type = bowlerType;
      }

      // Start background upload - this will continue even if app goes to background
      const result = await startUpload(formData);

      if (result) {
        Toast.show({
          type: 'success',
          text1: 'Analysis Complete!',
          text2: 'Your cricket technique has been analyzed successfully.',
        });
        router.push({
          pathname: '/results',
          params: { result: JSON.stringify(result) }
        });
      } else {
        throw new Error('Upload failed - no result received');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload video. Please try again.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <>
      {/* Animated Analysis Screen */}
      <AnalysisScreen
        visible={isUploading}
        progress={progress}
        status={analysisStatus}
      />

      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <Text style={[styles.title, { color: theme.colors.onBackground, fontSize: getResponsiveFontSize(28) }]}>
            Upload Video
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(16) }]}>
            Select a cricket video for AI analysis
          </Text>
        </Animated.View>

        {/* Player Type Selection */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              Player Type
            </Text>
            <RadioButton.Group onValueChange={value => setPlayerType(value as PlayerType)} value={playerType}>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    playerType === 'batsman' && { backgroundColor: theme.colors.primaryContainer }
                  ]}
                  onPress={() => setPlayerType('batsman')}
                  activeOpacity={0.7}
                >
                  <RadioButton value="batsman" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>Batsman</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    playerType === 'bowler' && { backgroundColor: theme.colors.primaryContainer }
                  ]}
                  onPress={() => setPlayerType('bowler')}
                  activeOpacity={0.7}
                >
                  <RadioButton value="bowler" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>Bowler</Text>
                </TouchableOpacity>
              </View>
            </RadioButton.Group>
          </PremiumCard>
        </Animated.View>

        {/* Player Side Selection */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              {playerType === 'batsman' ? 'Batting Side' : 'Bowling Side'}
            </Text>
            <RadioButton.Group onValueChange={value => setPlayerSide(value as PlayerSide)} value={playerSide}>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    playerSide === 'right' && { backgroundColor: theme.colors.primaryContainer }
                  ]}
                  onPress={() => setPlayerSide('right')}
                  activeOpacity={0.7}
                >
                  <RadioButton value="right" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>Right</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    playerSide === 'left' && { backgroundColor: theme.colors.primaryContainer }
                  ]}
                  onPress={() => setPlayerSide('left')}
                  activeOpacity={0.7}
                >
                  <RadioButton value="left" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>Left</Text>
                </TouchableOpacity>
              </View>
            </RadioButton.Group>
          </PremiumCard>
        </Animated.View>

        {/* Shot Type Selection - Only for Batsman */}
        {playerType === 'batsman' && (
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
                Shot Type (Optional)
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                Select a shot type or leave empty for automatic detection
              </Text>
              
              <Menu
                visible={shotTypeMenuVisible}
                onDismiss={() => setShotTypeMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={[styles.dropdownButton, { 
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outline 
                    }]}
                    onPress={() => setShotTypeMenuVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dropdownText, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
                      {shotType ? getShotDisplayName(shotType) : 'Select Shot Type (Optional)'}
                    </Text>
                    <Text style={[styles.dropdownIcon, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(12) }]}>
                      ▼
                    </Text>
                  </TouchableOpacity>
                }
              >
                {majorShots.map((shot) => (
                  <Menu.Item
                    key={shot}
                    onPress={() => {
                      setShotType(shot);
                      setShotTypeMenuVisible(false);
                      if (shot !== 'other') {
                        setCustomShotType('');
                      }
                    }}
                    title={getShotDisplayName(shot)}
                  />
                ))}
              </Menu>

              {/* Custom Shot Type Input - Show when "Other" is selected */}
              {shotType === 'other' && (
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.customShotContainer}>
                  <TextInput
                    label="Enter Shot Type"
                    value={customShotType}
                    onChangeText={setCustomShotType}
                    mode="outlined"
                    placeholder="e.g., reverse_sweep, scoop"
                    style={styles.customShotInput}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                  />
                </Animated.View>
              )}

              {/* Clear Selection Button */}
              {shotType && (
                <TouchableOpacity
                  onPress={() => {
                    setShotType('');
                    setCustomShotType('');
                  }}
                  style={styles.clearButtonContainer}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.clearButtonText, { color: theme.colors.error, fontSize: getResponsiveFontSize(14) }]}>
                    Clear Selection (Use Auto Detection)
                  </Text>
                </TouchableOpacity>
              )}
            </PremiumCard>
          </Animated.View>
        )}

        {/* Bowler Type Selection */}
        {playerType === 'bowler' && (
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              Bowler Type
            </Text>
              <RadioButton.Group onValueChange={value => setBowlerType(value as BowlerType)} value={bowlerType}>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      bowlerType === 'fast_bowler' && { backgroundColor: theme.colors.primaryContainer }
                    ]}
                    onPress={() => setBowlerType('fast_bowler')}
                    activeOpacity={0.7}
                  >
                    <RadioButton value="fast_bowler" />
                    <Text style={[styles.radioLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>Fast Bowler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.radioOption,
                      bowlerType === 'spin_bowler' && { backgroundColor: theme.colors.primaryContainer }
                    ]}
                    onPress={() => setBowlerType('spin_bowler')}
                    activeOpacity={0.7}
                  >
                    <RadioButton value="spin_bowler" />
                    <Text style={[styles.radioLabel, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>Spin Bowler</Text>
                  </TouchableOpacity>
                </View>
              </RadioButton.Group>
            </PremiumCard>
          </Animated.View>
        )}

        {/* Video Selection */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              Select Video
            </Text>
            
            {!selectedVideo ? (
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryContainer + '20' }]}
                onPress={pickVideo}
                activeOpacity={0.8}
              >
                <Text style={[styles.uploadIcon, { fontSize: getResponsiveSize(56) }]}>📤</Text>
                <Text style={[styles.uploadText, { color: theme.colors.primary, fontSize: getResponsiveFontSize(20) }]}>
                  Choose Video
                </Text>
                <Text style={[styles.uploadSubtext, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(15) }]}>
                  MP4, AVI, MOV, MKV (Max 100MB)
                </Text>
              </TouchableOpacity>
            ) : (
              <PremiumCard variant="outlined" padding="medium" style={styles.videoInfo}>
                <View style={styles.videoContent}>
                  <Text style={[styles.videoIcon, { fontSize: getResponsiveSize(32) }]}>🎥</Text>
                  <View style={styles.videoDetails}>
                    <Text style={[styles.videoName, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(16) }]}>
                      {selectedVideo.name}
                    </Text>
                    <Text style={[styles.videoSize, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                      {formatFileSize(selectedVideo.size)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setSelectedVideo(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.removeIcon, { fontSize: getResponsiveFontSize(20) }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            )}
          </PremiumCard>
        </Animated.View>

        {/* Upload Button */}
        <Animated.View entering={FadeInUp.delay(600).springify()}>
          <PremiumButton
            title={isUploading ? 'Analyzing...' : 'Start Analysis'}
            onPress={handleUpload}
            variant="primary"
            size="large"
            loading={isUploading}
            disabled={!selectedVideo || isUploading}
            fullWidth
          />
        </Animated.View>

        {/* Tips */}
        <Animated.View entering={FadeInUp.delay(700).springify()}>
          <PremiumCard variant="outlined" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface, fontSize: getResponsiveFontSize(20) }]}>
              💡 Tips for Best Results
            </Text>
            <View style={styles.tipsList}>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                • Ensure good lighting and clear visibility
              </Text>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                • Record from a side angle for better analysis
              </Text>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                • Keep the video steady and focused on the player
              </Text>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant, fontSize: getResponsiveFontSize(14) }]}>
                • Include the complete action in the frame
              </Text>
            </View>
          </PremiumCard>
        </Animated.View>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: getResponsiveSize(spacing.lg),
  },
  header: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(spacing.xl),
  },
  title: {
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  subtitle: {
    textAlign: 'center',
    // fontSize set dynamically
  },
  card: {
    marginBottom: getResponsiveSize(spacing.lg),
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.md),
    letterSpacing: 0.2,
    // fontSize set dynamically
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: getResponsiveSize(spacing.sm),
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSize(spacing.sm),
    borderRadius: borderRadius.md,
    flex: 1,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioLabel: {
    marginLeft: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    padding: getResponsiveSize(spacing.xl + 8),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: getResponsiveSize(180),
  },
  uploadIcon: {
    marginBottom: getResponsiveSize(spacing.md),
    // fontSize set dynamically
  },
  uploadText: {
    fontWeight: '700',
    marginBottom: getResponsiveSize(spacing.xs),
    letterSpacing: 0.3,
    // fontSize set dynamically
  },
  uploadSubtext: {
    textAlign: 'center',
    lineHeight: getResponsiveSize(20),
    // fontSize set dynamically
  },
  videoInfo: {
    marginTop: getResponsiveSize(spacing.md),
  },
  videoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoIcon: {
    marginRight: getResponsiveSize(spacing.md),
    // fontSize set dynamically
  },
  videoDetails: {
    flex: 1,
  },
  videoName: {
    fontWeight: '500',
    marginBottom: getResponsiveSize(spacing.xs),
    // fontSize set dynamically
  },
  videoSize: {
    // fontSize set dynamically
  },
  removeButton: {
    padding: getResponsiveSize(spacing.xs),
  },
  removeIcon: {
    color: colors.error,
    // fontSize set dynamically
  },
  progressBar: {
    marginBottom: getResponsiveSize(spacing.sm),
  },
  progressText: {
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
  },
  tipsList: {
    gap: getResponsiveSize(spacing.sm),
  },
  tip: {
    lineHeight: getResponsiveSize(20),
    // fontSize set dynamically
  },
  cardSubtitle: {
    marginBottom: getResponsiveSize(spacing.md),
    fontStyle: 'italic',
    // fontSize set dynamically
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSize(spacing.md),
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: getResponsiveSize(spacing.sm),
  },
  dropdownText: {
    flex: 1,
    // fontSize set dynamically
  },
  dropdownIcon: {
    marginLeft: getResponsiveSize(spacing.sm),
    // fontSize set dynamically
  },
  customShotContainer: {
    marginTop: getResponsiveSize(spacing.md),
  },
  customShotInput: {
    marginBottom: getResponsiveSize(spacing.sm),
  },
  clearButtonContainer: {
    marginTop: getResponsiveSize(spacing.md),
    paddingVertical: getResponsiveSize(spacing.xs),
  },
  clearButtonText: {
    fontWeight: '600',
    // fontSize set dynamically
  },
}); 