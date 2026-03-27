import { CameraView } from 'expo-camera';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BallSpeedCameraCaptureRef, BallSpeedCameraPreviewProps } from './ball-speed-camera.types';

export const BallSpeedCameraPreview = forwardRef<BallSpeedCameraCaptureRef, BallSpeedCameraPreviewProps>(
  function BallSpeedCameraPreview({ style, isActive: _isActive }, ref) {
    const cameraRef = useRef<CameraView | null>(null);

    useImperativeHandle(ref, () => ({
      captureBase64: async () => {
        if (!cameraRef.current) return null;
        try {
          const frame = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.1,
            skipProcessing: true,
          });
          return frame?.base64 ?? null;
        } catch {
          return null;
        }
      },
    }));

    return (
      <View style={[styles.wrap, style]}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
});
