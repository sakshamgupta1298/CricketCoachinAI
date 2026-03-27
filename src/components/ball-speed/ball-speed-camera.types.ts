import type { StyleProp, ViewStyle } from 'react-native';

export type BallSpeedCameraCaptureRef = {
  captureBase64: () => Promise<string | null>;
};

export type BallSpeedCameraPreviewProps = {
  style?: StyleProp<ViewStyle>;
  isActive: boolean;
};
