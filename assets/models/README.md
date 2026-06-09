# Ball detector model — `ball.tflite`

The on-device ball-speed feature (`src/ballspeed/`) loads `ball.tflite` from this
folder via `require('../../assets/models/ball.tflite')` in
[`src/ballspeed/useBallDetector.ts`](../../src/ballspeed/useBallDetector.ts).

**You must drop a `ball.tflite` here before building the app.** Without it, Metro
<<<<<<< HEAD
bundling fails (the `require` path must resolve to a real file).
=======
bundling will fail (the `require` path must resolve to a real file).
>>>>>>> d26dc33 (ball speed check)

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
yolo export model=yolov8n.tflite format=tflite int8=True imgsz=320
# (or use yolov8s for better small-object recall)
```
Copy the exported `*_full_integer_quant.tflite` here as `ball.tflite`.

`MODEL_CONFIG` (already the default):
```ts
numClasses: 80,
targetClass: 32,   // "sports ball"
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
```

---

## Model contract (both options)

<<<<<<< HEAD
- **Input:** `1 x 320 x 320 x 3`, `uint8` (matches `MODEL_INPUT_SIZE = 320` and the
  resize plugin's `dataType: 'uint8'` in `frameProcessor.ts`).
- **Output:** YOLOv8 head, channels-first `1 x (4 + numClasses) x N`. Rows are
  `cx, cy, w, h` then one score per class. The decoder reads the score at row
  `4 + targetClass`. If your export is `1 x N x (4+numClasses)`, transpose the
  indexing in `frameProcessor.ts`.
- **Quantization:** int8 weights for speed, but **keep float32 output tensors** (and
  uint8 input). The decoder reads `conf` as a float and thresholds at `0.3`; a full
  int8 export with int8 outputs would need dequantization (scale/zero-point) first.
- **Coordinate units:** the decoder multiplies `cx/cy/w/h` by `320`, i.e. assumes
  **normalized 0..1**. If your export emits pixel coords, set
  `MODEL_CONFIG.coordsNormalized = false`.

## Caveats for Option A (stock COCO)

- COCO "sports ball" was trained on soccer/basketball/tennis balls — a cricket ball
  looks different and is much smaller.
- Small-object recall at `imgsz=320` is weak (worse on `yolov8n`). Try `yolov8s` or
  `imgsz=640` (costs more phone inference time).
- A fast ball is motion-blurred, not a clean sphere — the stock model often misses it.

If Option A misses fast deliveries, move to Option B (or bump model size / imgsz).
Validate any model on sample bowling frames (ball localized with conf > 0.3) before
trusting the speed numbers — detection quality is the ceiling on accuracy.
=======
- **Architecture:** Stock YOLOv8-nano pre-trained on COCO (80 classes). The decoder
  in `frameProcessor.ts` filters **COCO class 32 = "sports ball"** — no custom
  cricket-ball training is required for the default build.
- **Input:** `1 x 320 x 320 x 3`, `uint8` (matches `MODEL_INPUT_SIZE = 320` and the
  resize plugin's `dataType: 'uint8'` in `frameProcessor.ts`).
- **Output:** YOLOv8 COCO head, channels-first `1 x 84 x N` where rows 0–3 are
  `cx, cy, w, h` and rows 4–83 are per-class scores. Ball confidence for anchor
  `j` is `out[(4 + 32) * N + j]`. If your export is `1 x N x 84`, flip the
  indexing in `frameProcessor.ts`.
- **Quantization:** int8 weights for speed, but **keep float32 output tensors**
  (and uint8 input). The decoder reads class scores as floats and thresholds at
  `0.3`; if you export *full* int8 with int8 outputs, add dequantization
  (scale/zero-point) before thresholding. The simplest path is an export whose
  I/O stays float (int8 weights only).
- **Coordinate units:** the Ultralytics TFLite export emits box coords in
  **input-pixel units (0..320)**, not normalized 0..1. The decoder uses them
  directly (no multiply by `MODEL_INPUT_SIZE`).

## Caveat

COCO "sports ball" recall on a small, fast cricket ball can be weak compared to a
dedicated cricket-ball detector. If on-device detection is unreliable, train a
single-class cricket-ball YOLOv8-nano and swap only `ball.tflite` (and the class
index in `frameProcessor.ts` if not class 32). The decoder layout, tracker, and
speed math stay the same.

## How to produce the stock model

```bash
pip install ultralytics
yolo export model=yolov8n.pt format=tflite int8=True imgsz=320
```

Copy the exported `yolov8n_full_integer_quant.tflite` (or `*_full_integer_quant.tflite`)
here as `ball.tflite`.

## Custom cricket-ball fallback

1. Get a labelled cricket-ball dataset (e.g. Roboflow) in YOLO format.
2. Train YOLOv8-nano:
   ```bash
   yolo detect train model=yolov8n.pt data=cricket-ball.yaml imgsz=320 epochs=100
   ```
3. Export to int8 TFLite:
   ```bash
   yolo export model=runs/detect/train/weights/best.pt format=tflite int8=True imgsz=320
   ```
4. Copy the exported `best_full_integer_quant.tflite` here as `ball.tflite` and
   update `frameProcessor.ts` for a single-class `[1, 5, N]` head if needed.

## Validate before wiring the UI

Run the exported model on a few sample bowling frames and confirm it localizes the
ball with conf > 0.3. On-device detection is only as good as this model — weak
recall will not beat the existing server-side OpenCV path.
>>>>>>> d26dc33 (ball speed check)
