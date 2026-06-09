# Ball detector model — `ball.tflite`

The on-device ball-speed feature (`src/ballspeed/`) loads `ball.tflite` from this
folder via `require('../../assets/models/ball.tflite')` in
[`src/ballspeed/useBallDetector.ts`](../../src/ballspeed/useBallDetector.ts).

**You must drop a `ball.tflite` here before building the app.** Without it, Metro
bundling fails (the `require` path must resolve to a real file).

The decoder is layout-aware — pick one of the two options below and set
`MODEL_CONFIG` in [`src/ballspeed/frameProcessor.ts`](../../src/ballspeed/frameProcessor.ts)
to match.

---

## Option A — Stock COCO YOLOv8 (zero training, quickest start)

COCO has a generic **"sports ball" class at index 32**. The stock model detects it
with no dataset or training. Best for validating the full pipeline; recall on fast,
motion-blurred deliveries is limited (see caveats).

```bash
pip install ultralytics
yolo export model=yolov8n.pt format=tflite int8=True imgsz=320
# (or use yolov8s for better small-object recall)
```
Copy the exported `*_full_integer_quant.tflite` here as `ball.tflite`.

`MODEL_CONFIG` (already the default):
```ts
numClasses: 80,
targetClass: 32,   // "sports ball"
coordsNormalized: false,
```

## Option B — Custom single-class cricket-ball model (best accuracy)

Fine-tune on a labelled cricket-ball dataset (e.g. a Roboflow "cricket ball
detection" set in YOLO format).

```bash
pip install ultralytics
yolo detect train model=yolov8n.pt data=cricket-ball.yaml imgsz=320 epochs=100
yolo export model=runs/detect/train/weights/best.pt format=tflite int8=True imgsz=320
```
Copy `best_full_integer_quant.tflite` here as `ball.tflite`, then set:
```ts
numClasses: 1,
targetClass: 0,
coordsNormalized: false,
```

---

## Model contract (both options)

- **Input:** `1 x 320 x 320 x 3`, `uint8` (matches `MODEL_INPUT_SIZE = 320` and the
  resize plugin's `dataType: 'uint8'` in `frameProcessor.ts`).
- **Output:** YOLOv8 head, channels-first `1 x (4 + numClasses) x N`. Rows are
  `cx, cy, w, h` then one score per class. The decoder reads the score at row
  `4 + targetClass`. If your export is `1 x N x (4+numClasses)`, transpose the
  indexing in `frameProcessor.ts`.
- **Quantization:** the default build expects a **full int8** export
  (`*_full_integer_quant.tflite`). The decoder dequantizes int8 outputs using the
  scale/zero-point baked into `frameProcessor.ts` before thresholding at `0.3`. If
  you export with float32 output tensors instead, remove or bypass dequantization.
- **Coordinate units:** Ultralytics int8 exports emit box coords in **input-pixel
  units (0..320)**, not normalized 0..1. The default is
  `MODEL_CONFIG.coordsNormalized = false`. Set it to `true` only if your export
  emits normalized coords (then the decoder multiplies by `320`).

## Caveats for Option A (stock COCO)

- COCO "sports ball" was trained on soccer/basketball/tennis balls — a cricket ball
  looks different and is much smaller.
- Small-object recall at `imgsz=320` is weak (worse on `yolov8n`). Try `yolov8s` or
  `imgsz=640` (costs more phone inference time).
- A fast ball is motion-blurred, not a clean sphere — the stock model often misses it.

If Option A misses fast deliveries, move to Option B (or bump model size / imgsz).
Validate any model on sample bowling frames (ball localized with conf > 0.3) before
trusting the speed numbers — detection quality is the ceiling on accuracy.
