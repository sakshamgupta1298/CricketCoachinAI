/**
 * Loads the on-device ball detector (stock YOLOv8-nano COCO, TFLite int8).
 *
 * The model is bundled as an asset and run inside a vision-camera frame
 * processor via `react-native-fast-tflite`. Input is a 320x320x3 uint8 tensor;
 * output is YOLOv8 detections (see decode in frameProcessor.ts).
 */
import { useTensorflowModel } from 'react-native-fast-tflite';

// Model input side length (square). Keep in sync with the exported model.
export const MODEL_INPUT_SIZE = 320;

export function useBallDetector() {
  // GPU on Android (NNAPI/GPU libs) / CoreML on iOS, configured in app.json.
  const plugin = useTensorflowModel(
    require('../../assets/models/ball.tflite'),
    'core-ml',
  );
  return {
    model: plugin.state === 'loaded' ? plugin.model : undefined,
    isLoaded: plugin.state === 'loaded',
    error: plugin.state === 'error' ? plugin.error : undefined,
  };
}
