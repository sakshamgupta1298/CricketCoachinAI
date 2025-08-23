import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { default as React, default as React, useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Colors, Spacing, Typography } from '../design/DesignSystem';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width, height } = Dimensions.get('window');

type VideoCaptureScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VideoCapture'>;

export const VideoCaptureScreen: React.FC = () => {
  const navigation = useNavigation<VideoCaptureScreenNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const startRecording = async () => {
    if (cameraRef.current) {
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({
          quality: '720p',
          maxDuration: 30, // 30 seconds max
        });
        // Navigate to upload progress with video URI
        navigation.navigate('UploadProgress', { videoUri: video.uri });
      } catch (error) {
        Alert.alert('Error', 'Failed to record video');
      } finally {
        setIsRecording(false);
      }
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => (
      current === CameraType.back ? CameraType.front : CameraType.back
    ));
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleGallerySelect = () => {
    // TODO: Implement gallery selection
    Alert.alert('Gallery', 'Gallery selection coming soon!');
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Card style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionDescription}>
            CrickCoach needs camera access to record your cricket technique for analysis.
          </Text>
          <Button
            title="Grant Permission"
            onPress={() => Camera.requestCameraPermissionsAsync()}
            variant="primary"
            size="lg"
            style={styles.permissionButton}
          />
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        ratio="16:9"
      >
        {/* Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.3)']}
          style={styles.overlay}
        >
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={toggleCameraType} style={styles.flipButton}>
              <Ionicons name="camera-reverse" size={24} color={Colors.text.inverse} />
            </TouchableOpacity>
          </View>

          {/* Center Guidelines */}
          <View style={styles.guidelines}>
            <View style={styles.guidelineFrame}>
              <View style={styles.corner} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.guidelineText}>
              Position yourself within the frame
            </Text>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {/* Gallery Button */}
            <TouchableOpacity onPress={handleGallerySelect} style={styles.galleryButton}>
              <Ionicons name="images" size={28} color={Colors.text.inverse} />
              <Text style={styles.galleryText}>Gallery</Text>
            </TouchableOpacity>

            {/* Record Button */}
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordButton, isRecording && styles.recordButtonRecording]}
            >
              <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerRecording]} />
            </TouchableOpacity>

            {/* Settings Button */}
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons name="settings" size={28} color={Colors.text.inverse} />
              <Text style={styles.settingsText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Camera>

      {/* Recording Indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.dark,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guidelines: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  guidelineFrame: {
    width: width * 0.8,
    height: height * 0.4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: Colors.primary[500],
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  cornerBottomLeft: {
    bottom: 0,
    top: 'auto',
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  guidelineText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.lg,
    textAlign: 'center',
    opacity: 0.8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  galleryButton: {
    alignItems: 'center',
  },
  galleryText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.xs,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.text.inverse,
  },
  recordButtonRecording: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.text.inverse,
  },
  recordButtonInnerRecording: {
    backgroundColor: Colors.text.inverse,
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  settingsButton: {
    alignItems: 'center',
  },
  settingsText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.xs,
  },
  recordingIndicator: {
    position: 'absolute',
    top: Spacing['2xl'],
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    paddingVertical: Spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.text.inverse,
    marginRight: Spacing.sm,
  },
  recordingText: {
    color: Colors.text.inverse,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  permissionCard: {
    margin: Spacing.lg,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  permissionButton: {
    minWidth: 200,
  },
  permissionText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
}); 
