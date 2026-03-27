import * as FileSystem from 'expo-file-system';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraFormat, useCameraPermission } from 'react-native-vision-camera';
import type { BallSpeedCameraCaptureRef, BallSpeedCameraPreviewProps } from './ball-speed-camera.types';

export const BallSpeedCameraPreview = forwardRef<BallSpeedCameraCaptureRef, BallSpeedCameraPreviewProps>(
  function BallSpeedCameraPreview({ style, isActive }, ref) {
    const cameraRef = useRef<Camera>(null);
    const device = useCameraDevice('back');
    const format = useCameraFormat(device, [
      { fps: 60 },
      { videoResolution: 'max' },
    ]);
    const { hasPermission, requestPermission } = useCameraPermission();

    const fps = useMemo(() => {
      if (!format) return 60;
      const cap = format.maxFps > 0 ? format.maxFps : 60;
      return Math.min(60, cap);
    }, [format]);

    useImperativeHandle(ref, () => ({
      captureBase64: async () => {
        const cam = cameraRef.current;
        if (!cam) return null;
        try {
          const photo = await cam.takePhoto({
            flash: 'off',
            enableShutterSound: false,
          });
          const path = photo.path;
          const uri = path.startsWith('file:') ? path : `file://${path}`;
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
          await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
          return base64;
        } catch {
          return null;
        }
      },
    }));

    if (!hasPermission) {
      return (
        <View style={[styles.placeholder, style]}>
          <Text style={styles.placeholderText}>Camera access is required for ball speed.</Text>
          <Pressable onPress={() => void requestPermission()} style={styles.permissionBtn}>
            <Text style={styles.permissionBtnText}>Grant camera access</Text>
          </Pressable>
        </View>
      );
    }

    if (!device) {
      return (
        <View style={[styles.placeholder, style]}>
          <Text style={styles.placeholderText}>No back camera found.</Text>
        </View>
      );
    }

    return (
      <Camera
        ref={cameraRef}
        style={[StyleSheet.absoluteFill, style]}
        device={device}
        format={format}
        fps={fps}
        photo
        photoQualityBalance="speed"
        isActive={isActive}
        audio={false}
      />
    );
  },
);

const styles = StyleSheet.create({
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
  },
  placeholderText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
