/**
 * Vision-camera frame processor that runs the on-device ball detector and
 * collects one detection per processed frame into a shared buffer.
 *
 * Pipeline (runs on the frame-processor worklet thread):
 *   frame -> resize to 320x320 uint8 -> TFLite inference -> decode YOLOv8 ->
 *   pick highest-confidence ball box -> push { frame, t, x, y, radius }.
 *
 * Detections are kept in 320x320 ("model") pixel space; tracking/scoring in
 * track.ts is scale-relative, and speed depends only on time + the user's
 * Distance(m), so working in model space is fine.
 */
import type { TensorflowModel } from 'react-native-fast-tflite';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'react-native-vision-camera-resize-plugin';
import type { SharedValue } from 'react-native-reanimated';
import type { Detection } from './track';
import { MODEL_INPUT_SIZE } from './useBallDetector';

// Minimum class confidence to accept a ball detection.
const CONF_THRESHOLD = 0.3;
// Process 1 of every N frames to bound CPU at high capture fps.
const FRAME_STRIDE = 1;

/**
 * Output layout of the bundled model. Two supported shapes (channels-first,
 * i.e. `[1, 4 + numClasses, N]`):
 *
 *  - Stock COCO YOLOv8 (`yolov8n.tflite`): numClasses = 80, the ball is the
 *    "sports ball" class at index 32. Drop in the stock model with zero training.
 *  - Custom single-class cricket-ball model: numClasses = 1, targetClass = 0.
 *
 * Switch by editing this one constant (and the file you drop in as ball.tflite).
 */
export const MODEL_CONFIG = {
  /** Number of class score rows in the output (80 for COCO, 1 for custom). */
  numClasses: 80,
  /** Which class to keep (32 = "sports ball" in COCO; 0 for single-class). */
  targetClass: 32,
  /** True if box coords are normalized 0..1 (multiply by input size). Set
   *  false if your export emits pixel coords (0..input size). */
  coordsNormalized: true,
} as const;

export interface FrameProcessorRefs {
  /** Whether we are actively capturing a delivery. */
  capturing: SharedValue<boolean>;
  /** Accumulated detections (read on JS thread when capture stops). */
  detections: SharedValue<Detection[]>;
  /** Monotonic processed-frame counter. */
  sampleIndex: SharedValue<number>;
}

export function useBallSpeedFrameProcessor(
  model: TensorflowModel | undefined,
  refs: FrameProcessorRefs,
) {
  const { resize } = useResizePlugin();

  return useFrameProcessor(
    (frame) => {
      'worklet';
      if (model == null) return;
      if (!refs.capturing.value) return;

      // Stride throttle.
      refs.sampleIndex.value += 1;
      if (refs.sampleIndex.value % FRAME_STRIDE !== 0) return;

      // Resize to the model's square uint8 input.
      const input = resize(frame, {
        scale: { width: MODEL_INPUT_SIZE, height: MODEL_INPUT_SIZE },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      const outputs = model.runSync([input]);
      const out = outputs[0];

      // YOLOv8 TFLite output is channels-first: [1, 4 + numClasses, N].
      // Rows 0..3 = cx, cy, w, h; row (4 + targetClass) = the class score.
      // index(c, j) = c * N + j. (COCO has no separate objectness in v8.)
      const channels = 4 + MODEL_CONFIG.numClasses;
      const N = out.length / channels;
      const confRow = 4 + MODEL_CONFIG.targetClass;
      let bestConf = CONF_THRESHOLD;
      let bestCx = 0;
      let bestCy = 0;
      let bestW = 0;
      let bestH = 0;
      for (let j = 0; j < N; j++) {
        const conf = out[confRow * N + j] as number;
        if (conf > bestConf) {
          bestConf = conf;
          bestCx = out[j] as number;
          bestCy = out[N + j] as number;
          bestW = out[2 * N + j] as number;
          bestH = out[3 * N + j] as number;
        }
      }
      if (bestConf <= CONF_THRESHOLD) return; // no ball this frame

      const s = MODEL_CONFIG.coordsNormalized ? MODEL_INPUT_SIZE : 1;
      const x = bestCx * s;
      const y = bestCy * s;
      const radius = (Math.max(bestW, bestH) * s) / 2;

      // frame.timestamp is in nanoseconds; convert to seconds for speed math.
      const t = frame.timestamp / 1e9;

      const det: Detection = { frame: refs.sampleIndex.value, t, x, y, radius };
      refs.detections.value = [...refs.detections.value, det];
    },
    [model, refs.capturing, refs.detections, refs.sampleIndex],
  );
}
