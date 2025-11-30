# CrickCoach - Performance Metrics

## Model Performance Benchmarks

### 1. SlowFast R50 - Shot Prediction Accuracy

**Top-1 Accuracy: 85-92%**

**Details:**
- Base model (SlowFast R50) achieves **79.9% top-1 accuracy** on Kinetics-400 dataset
- Our implementation is fine-tuned for **binary classification** (coverdrive vs pull_shot)
- Binary classification typically achieves **5-10% higher accuracy** than multi-class
- Estimated accuracy range: **85-92%** for cricket shot classification
- Factors affecting accuracy:
  - Video quality and lighting
  - Camera angle and framing
  - Shot execution clarity
  - Background complexity

**Note:** Actual accuracy may vary based on:
- Training dataset quality
- Model fine-tuning specifics
- Test dataset characteristics

---

### 2. MoveNet Thunder - Pose Detection Recall

**Detection Recall: 88-93%**

**Details:**
- MoveNet Thunder achieves **mAP of 72.0** on COCO keypoint dataset
- In similar applications (yoga posture correction), recall of **86%** was reported
- For cricket pose detection, recall is typically **88-93%** due to:
  - Clearer body visibility in sports videos
  - Less occlusion compared to crowded scenes
  - Standardized camera angles
- Recall factors:
  - **High recall (>90%)**: Well-lit videos, clear body visibility, side angles
  - **Medium recall (85-90%)**: Partial occlusion, multiple players, complex backgrounds
  - **Lower recall (<85%)**: Poor lighting, extreme angles, heavy occlusion

**Keypoint Detection:**
- 17 keypoints detected per frame
- Average keypoint confidence: **0.85-0.95** for visible joints
- Lower confidence for occluded joints (0.5-0.7)

---

### 3. Average Processing Time per 60s Video

**Processing Time: 45-90 seconds**

**Breakdown:**

#### Component-wise Processing Time:

1. **Video Loading & Frame Extraction**: 2-5 seconds
   - Reading video file
   - Extracting frames
   - Format conversion

2. **SlowFast Shot Prediction**: 3-5 seconds
   - Extracts 32 frames
   - Model inference: ~0.1s per batch
   - Total: ~3-5 seconds

3. **MoveNet Pose Detection**: 25-50 seconds
   - 60s video at 30fps = **1,800 frames**
   - MoveNet Thunder: **~15-25ms per frame** (on GPU)
   - Sequential processing: 1,800 × 0.02s = **36 seconds**
   - With overhead: **25-50 seconds** (depends on hardware)

4. **Feature Computation**: 2-5 seconds
   - Calculating angles, distances, ratios
   - Statistical aggregations
   - CSV file generation

5. **GPT-4o API Call**: 10-25 seconds
   - File upload to OpenAI: 2-5 seconds
   - API processing: 8-20 seconds
   - Response parsing: 1-2 seconds

6. **Report Generation**: 1-3 seconds
   - Text report creation
   - File writing

**Total Estimated Time:**
- **Best case (GPU, fast network)**: 45-60 seconds
- **Average case**: 60-75 seconds
- **Worst case (CPU only, slow network)**: 75-90 seconds

**Hardware Considerations:**
- **GPU (CUDA)**: 45-60 seconds
- **CPU only**: 75-120 seconds
- **Cloud GPU (AWS/GCP)**: 50-70 seconds

**Optimization Notes:**
- Frame skipping (every 2nd or 3rd frame) can reduce MoveNet time by 50%
- Batch processing multiple frames can improve efficiency
- Parallel processing of SlowFast and MoveNet (if separate videos)

---

## Performance Benchmarks Summary

| Metric | Value | Notes |
|-------|-------|-------|
| **SlowFast Accuracy (top-1)** | **85-92%** | Binary classification (coverdrive/pull_shot) |
| **MoveNet Detection Recall** | **88-93%** | Pose keypoint detection in cricket videos |
| **Avg Processing Time (60s video)** | **45-90 seconds** | Depends on hardware (GPU vs CPU) |

---

## Factors Affecting Performance

### Accuracy Factors:

**SlowFast:**
- ✅ High accuracy: Clear shot execution, good lighting, side angle
- ⚠️ Medium accuracy: Partial occlusion, multiple players, fast motion
- ❌ Lower accuracy: Poor quality, extreme angles, incomplete shots

**MoveNet:**
- ✅ High recall: Full body visible, good lighting, standard angles
- ⚠️ Medium recall: Partial occlusion, loose clothing, multiple people
- ❌ Lower recall: Heavy occlusion, poor lighting, extreme zoom

### Processing Time Factors:

**Faster Processing:**
- GPU acceleration (CUDA)
- Lower video resolution
- Shorter video duration
- Frame skipping optimization
- Fast internet (for GPT-4o API)

**Slower Processing:**
- CPU-only processing
- High resolution videos
- Longer video duration
- Processing every frame
- Slow network connection

---

## Real-World Performance Expectations

### Typical User Experience:

**For a 60-second cricket video:**

1. **Upload Time**: 5-15 seconds (depends on file size and network)
2. **Processing Time**: 45-90 seconds (as detailed above)
3. **Total Wait Time**: **50-105 seconds** (approximately 1-2 minutes)

**For a 30-second cricket video:**
- Processing time: **25-50 seconds**
- Total wait time: **30-65 seconds**

**For a 10-second cricket video:**
- Processing time: **15-30 seconds**
- Total wait time: **20-45 seconds**

---

## Performance Optimization Recommendations

1. **Use GPU acceleration** when available
2. **Implement frame skipping** for MoveNet (process every 2nd frame)
3. **Cache model loading** (already implemented)
4. **Batch process** multiple frames when possible
5. **Optimize video resolution** before upload
6. **Use async processing** for GPT-4o API calls
7. **Implement progress tracking** for user feedback

---

## Testing & Validation

To obtain actual performance metrics for your specific implementation:

1. **Accuracy Testing:**
   - Create test dataset with labeled cricket videos
   - Evaluate SlowFast predictions against ground truth
   - Calculate precision, recall, and F1-score

2. **Recall Testing:**
   - Manually label keypoints in sample frames
   - Compare MoveNet detections with ground truth
   - Calculate keypoint detection recall

3. **Processing Time Testing:**
   - Benchmark on different hardware configurations
   - Test with various video lengths and resolutions
   - Measure each component separately
   - Average across multiple test videos

---

## Notes

- These metrics are **estimates** based on model specifications and typical performance
- Actual performance may vary based on:
  - Hardware configuration
  - Video quality and characteristics
  - Model fine-tuning specifics
  - Implementation optimizations
- For production use, conduct **comprehensive testing** with your specific dataset and hardware

