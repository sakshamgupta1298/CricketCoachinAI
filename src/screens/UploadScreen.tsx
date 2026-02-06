import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Menu,
  ProgressBar,
  RadioButton,
  Surface,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { useUpload } from '../context/UploadContext';
import apiService from '../services/api';
import { borderRadius, colors, shadows, spacing } from '../theme';
import { BowlerType, PlayerSide, PlayerType, UploadFormData } from '../types';

type RootStackParamList = {
  Main: undefined;
  Results: { result: any };
};

type UploadScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

const UploadScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<UploadScreenNavigationProp>();
  const { isUploading, progress, startUpload, updateProgress } = useUpload();

  const [playerType, setPlayerType] = useState<PlayerType>('batsman');
  const [playerSide, setPlayerSide] = useState<PlayerSide>('right');
  const [bowlerType, setBowlerType] = useState<BowlerType>('fast_bowler');
  const [shotType, setShotType] = useState<string>('');
  const [customShotType, setCustomShotType] = useState<string>('');
  const [shotTypeMenuVisible, setShotTypeMenuVisible] = useState(false);
  
  // Reset shot type when player type changes
  React.useEffect(() => {
    if (playerType !== 'batsman') {
      setShotType('');
      setCustomShotType('');
    }
  }, [playerType]);
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

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your media library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
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
        // Backend currently requires shot_type for batsman uploads.
        // If "Other" is selected, use the custom value; otherwise use the chosen shot.
        // (If you later re-enable backend auto-detection, this can be made optional again.)
        if (shotType === 'other') {
          if (!customShotType.trim()) {
            Alert.alert('Shot Type Required', 'Please enter a shot type.');
            return;
          }
          formData.shot_type = customShotType.trim().toLowerCase().replace(/\s+/g, '_');
        } else {
          if (!shotType) {
            Alert.alert('Shot Type Required', 'Please select a shot type.');
            return;
          }
          formData.shot_type = shotType;
        }
      } else {
        formData.bowler_side = playerSide;
        formData.bowler_type = bowlerType;
      }

      // startUpload handles upload -> backend job enqueue -> polling until results are ready
      const result = await startUpload(formData);

      Toast.show({
        type: 'success',
        text1: 'Analysis Complete!',
        text2: 'Your cricket technique has been analyzed successfully.',
      });
      navigation.navigate('Results' as any, { result });
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.onBackground }]}>
            Upload Video
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Select a cricket video for AI analysis
          </Text>
        </View>

        {/* Player Type Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Player Type
            </Text>
            <RadioButton.Group onValueChange={value => setPlayerType(value as PlayerType)} value={playerType}>
              <View style={styles.radioGroup}>
                <View style={styles.radioItem}>
                  <RadioButton value="batsman" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Batsman</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="bowler" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Bowler</Text>
                </View>
              </View>
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* Player Side Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              {playerType === 'batsman' ? 'Batting Side' : 'Bowling Side'}
            </Text>
            <RadioButton.Group onValueChange={value => setPlayerSide(value as PlayerSide)} value={playerSide}>
              <View style={styles.radioGroup}>
                <View style={styles.radioItem}>
                  <RadioButton value="right" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Right</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="left" />
                  <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Left</Text>
                </View>
              </View>
            </RadioButton.Group>
          </Card.Content>
        </Card>

        {/* Shot Type Selection - Only for Batsman */}
        {playerType === 'batsman' && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Shot Type
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
                  >
                    <Text style={[styles.dropdownText, { color: theme.colors.onSurface }]}>
                      {shotType ? getShotDisplayName(shotType) : 'Select Shot Type'}
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
                <View style={styles.customShotContainer}>
                  <TextInput
                    label="Enter Shot Type"
                    value={customShotType}
                    onChangeText={setCustomShotType}
                    mode="outlined"
                    placeholder="e.g., reverse_sweep, scoop"
                    style={styles.customShotInput}
                  />
                </View>
              )}

              {/* Clear Selection Button */}
              {shotType && (
                <Button
                  mode="text"
                  onPress={() => {
                    setShotType('');
                    setCustomShotType('');
                  }}
                  style={styles.clearButton}
                  textColor={theme.colors.error}
                >
                  Clear Selection
                </Button>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Bowler Type Selection */}
        {playerType === 'bowler' && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Bowler Type
              </Text>
              <RadioButton.Group onValueChange={value => setBowlerType(value as BowlerType)} value={bowlerType}>
                <View style={styles.radioGroup}>
                  <View style={styles.radioItem}>
                    <RadioButton value="fast_bowler" />
                    <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Fast Bowler</Text>
                  </View>
                  <View style={styles.radioItem}>
                    <RadioButton value="spin_bowler" />
                    <Text style={[styles.radioLabel, { color: theme.colors.onSurface }]}>Spin Bowler</Text>
                  </View>
                </View>
              </RadioButton.Group>
            </Card.Content>
          </Card>
        )}

        {/* Video Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Select Video
            </Text>
            
            {!selectedVideo ? (
              <TouchableOpacity
                style={[styles.uploadButton, { borderColor: theme.colors.outline }]}
                onPress={pickVideo}
                activeOpacity={0.7}
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
              <Surface style={[styles.videoInfo, { backgroundColor: theme.colors.surfaceVariant }]}>
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
                >
                  <Text style={styles.removeIcon}>✕</Text>
                </TouchableOpacity>
              </Surface>
            )}
          </Card.Content>
        </Card>

        {/* Upload Progress */}
        {isUploading && (
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
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
            </Card.Content>
          </Card>
        )}

        {/* Upload Button */}
        <Button
          mode="contained"
          onPress={handleUpload}
          disabled={!selectedVideo || isUploading}
          loading={isUploading}
          style={styles.uploadActionButton}
          contentStyle={styles.uploadActionButtonContent}
          labelStyle={styles.uploadActionButtonLabel}
        >
          {isUploading ? 'Analyzing...' : 'Start Analysis'}
        </Button>

        {/* Tips */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Tips for Best Results
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
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

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
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  uploadSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
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
  uploadActionButton: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  uploadActionButtonContent: {
    paddingVertical: spacing.md,
  },
  uploadActionButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
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
  clearButton: {
    marginTop: spacing.xs,
  },
});

export default UploadScreen; 