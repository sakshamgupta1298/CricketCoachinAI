import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Menu, ProgressBar, RadioButton, Text, TextInput, useTheme } from 'react-native-paper';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { PremiumButton } from '../../src/components/ui/PremiumButton';
import { PremiumCard } from '../../src/components/ui/PremiumCard';
import { useUpload } from '../../src/context/UploadContext';
import apiService from '../../src/services/api';
import { borderRadius, colors, spacing } from '../../src/theme';
import { BowlerType, PlayerSide, PlayerType, UploadFormData } from '../../src/types';

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

      startUpload(formData);

      const response = await apiService.uploadVideo(formData);

      if (response.success && response.data) {
        completeUpload(response.data);
        Toast.show({
          type: 'success',
          text1: 'Analysis Complete!',
          text2: 'Your cricket technique has been analyzed successfully.',
        });
        router.push({
          pathname: '/results',
          params: { result: JSON.stringify(response.data) }
        });
      } else {
        throw new Error(response.error || 'Upload failed');
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
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Upload Video
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Select a cricket video for AI analysis
          </Text>
        </Animated.View>

        {/* Player Type Selection */}
        <Animated.View entering={FadeInUp.delay(200).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
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
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Batsman</Text>
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
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Bowler</Text>
                </TouchableOpacity>
              </View>
            </RadioButton.Group>
          </PremiumCard>
        </Animated.View>

        {/* Player Side Selection */}
        <Animated.View entering={FadeInUp.delay(300).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
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
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Right</Text>
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
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Left</Text>
                </TouchableOpacity>
              </View>
            </RadioButton.Group>
          </PremiumCard>
        </Animated.View>

        {/* Shot Type Selection - Only for Batsman */}
        {playerType === 'batsman' && (
          <Animated.View entering={FadeInUp.delay(400).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Shot Type (Optional)
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
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
                    <Text style={[styles.dropdownText, { color: theme.colors.onSurface }]}>
                      {shotType ? getShotDisplayName(shotType) : 'Select Shot Type (Optional)'}
                    </Text>
                    <Text style={[styles.dropdownIcon, { color: theme.colors.onSurfaceVariant }]}>
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
                  <Text style={[styles.clearButtonText, { color: theme.colors.error }]}>
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
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
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
                    <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Fast Bowler</Text>
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
                    <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Spin Bowler</Text>
                  </TouchableOpacity>
                </View>
              </RadioButton.Group>
            </PremiumCard>
          </Animated.View>
        )}

        {/* Video Selection */}
        <Animated.View entering={FadeInUp.delay(500).springify()}>
          <PremiumCard variant="elevated" padding="large" style={styles.card}>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Select Video
            </Text>
            
            {!selectedVideo ? (
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryContainer + '20' }]}
                onPress={pickVideo}
                activeOpacity={0.8}
              >
                <Text style={styles.uploadIcon}>📤</Text>
                <Text style={[styles.uploadText, { color: theme.colors.primary }]}>
                  Choose Video
                </Text>
                <Text style={[styles.uploadSubtext, { color: theme.colors.onSurfaceVariant }]}>
                  MP4, AVI, MOV, MKV (Max 100MB)
                </Text>
              </TouchableOpacity>
            ) : (
              <PremiumCard variant="outlined" padding="medium" style={styles.videoInfo}>
                <View style={styles.videoContent}>
                  <Text style={styles.videoIcon}>🎥</Text>
                  <View style={styles.videoDetails}>
                    <Text style={[styles.videoName, { color: theme.colors.onSurface }]}>
                      {selectedVideo.name}
                    </Text>
                    <Text style={[styles.videoSize, { color: theme.colors.onSurfaceVariant }]}>
                      {formatFileSize(selectedVideo.size)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => setSelectedVideo(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              </PremiumCard>
            )}
          </PremiumCard>
        </Animated.View>

        {/* Upload Progress */}
        {isUploading && (
          <Animated.View entering={FadeInUp.delay(600).springify()}>
            <PremiumCard variant="elevated" padding="large" style={styles.card}>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Uploading...
              </Text>
              <ProgressBar
                progress={progress / 100}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}>
                {progress}% Complete
              </Text>
            </PremiumCard>
          </Animated.View>
        )}

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
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              💡 Tips for Best Results
            </Text>
            <View style={styles.tipsList}>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant }]}>
                • Ensure good lighting and clear visibility
              </Text>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant }]}>
                • Record from a side angle for better analysis
              </Text>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant }]}>
                • Keep the video steady and focused on the player
              </Text>
              <Text style={[styles.tip, { color: theme.colors.onSurfaceVariant }]}>
                • Include the complete action in the frame
              </Text>
            </View>
          </PremiumCard>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
    letterSpacing: 0.2,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    flex: 1,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: spacing.xs,
  },
  uploadButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    padding: spacing.xl + 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  uploadIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  uploadText: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: 0.3,
  },
  uploadSubtext: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoInfo: {
    marginTop: spacing.md,
  },
  videoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  videoDetails: {
    flex: 1,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  videoSize: {
    fontSize: 14,
  },
  removeButton: {
    padding: spacing.xs,
  },
  removeIcon: {
    fontSize: 20,
    color: colors.error,
  },
  progressBar: {
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  tipsList: {
    gap: spacing.sm,
  },
  tip: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownIcon: {
    fontSize: 12,
    marginLeft: spacing.sm,
  },
  customShotContainer: {
    marginTop: spacing.md,
  },
  customShotInput: {
    marginBottom: spacing.sm,
  },
  clearButtonContainer: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 