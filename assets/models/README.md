# Ball detector model — `ball.tflite`

The on-device ball-speed feature (`src/ballspeed/`) loads `ball.tflite` from this
folder via `require('../../assets/models/ball.tflite')` in
[`src/ballspeed/useBallDetector.ts`](../../src/ballspeed/useBallDetector.ts).

**You must drop a trained `ball.tflite` here before building the app.** Without it,
Metro bundling will fail (the `require` path must resolve to a real file).

## Expected model contract

- **Architecture:** YOLOv8-nano (single class: `cricket-ball`).
- **Input:** `1 x 320 x 320 x 3`, `uint8` (matches `MODEL_INPUT_SIZE = 320` and the
  resize plugin's `dataType: 'uint8'` in `frameProcessor.ts`).
- **Output:** YOLOv8 head, channels-first `1 x 5 x N` where the 5 rows are
  `cx, cy, w, h, conf`, all normalized `0..1`. The decoder in `frameProcessor.ts`
  assumes this layout — if your export is `1 x N x 5`, flip the indexing there.
- **Quantization:** int8 weights for speed, but **keep float32 output tensors**
  (and uint8 input). The decoder in `frameProcessor.ts` reads `conf` as a float and
  thresholds at `0.3`; if you export *full* int8 with int8 outputs, you must add
  dequantization (scale/zero-point) before thresholding. The simplest path is an
  export whose I/O stays float (int8 weights only).
- **Coordinate units:** the decoder multiplies `cx/cy/w/h` by `320`, i.e. it assumes
  **normalized 0..1** outputs. If your export emits pixel coords (0..320), remove that
  multiply in `frameProcessor.ts`.

## How to produce it

1. Get a labelled cricket-ball dataset (e.g. a Roboflow "cricket ball detection"
   dataset) in YOLO format.
2. Train YOLOv8-nano:
   ```bash
   pip install ultralytics
   yolo detect train model=yolov8n.pt data=cricket-ball.yaml imgsz=320 epochs=100
   ```
3. Export to int8 TFLite:
   ```bash
   yolo export model=runs/detect/train/weights/best.pt format=tflite int8=True imgsz=320
   ```
4. Copy the exported `best_full_integer_quant.tflite` here as `ball.tflite`.

## Validate before wiring the UI

Run the exported model on a few sample bowling frames and confirm it localizes the
ball with conf > 0.3. On-device detection is only as good as this model — a weak
model will not beat the existing server-side OpenCV path.
