# Backend Processing Time Optimization Plan

**Current Processing Time:** 5-7 minutes  
**Target Processing Time:** 1.5-3 minutes (60-70% reduction)

---

## 🚀 PRIORITY 1: High-Impact Optimizations (Save 2-4 minutes)

### 1. Make Annotated Video Creation Optional/Async
**Current Issue:** Annotated video is created synchronously before returning results (line 1134, 2232, 2296)  
**Time Saved:** 1-2 minutes  
**Difficulty:** Medium

**Implementation:**
- Add request parameter `generate_annotated_video` (default: false)
- Move annotated video creation to background thread
- Return results immediately, frontend can poll for annotated video status
- Or create annotated video only when user requests it

**Code Changes Needed:**
```python
# In extract_pose_keypoints() - make annotated video optional
def extract_pose_keypoints(video_path, player_type, create_annotated=False):
    # ... existing keypoint extraction code ...
    
    annotated_video_path = None
    if create_annotated:
        try:
            annotated_video_path = create_annotated_video(video_path, keypoints_path, player_type)
        except Exception as e:
            logger.error(f"Error creating annotated video: {e}")
    
    return keypoints_path, annotated_video_path

# In api_upload_file() - add parameter
create_annotated = request.form.get('generate_annotated_video', 'false').lower() == 'true'
keypoints_path, annotated_video_path = extract_pose_keypoints(filepath, 'batting', create_annotated=create_annotated)
```

---

### 2. Use Faster Gemini Model for Stage 2
**Current Issue:** Using `gemini-2.5-pro` for Stage 2 (line 1631, 732) - slower and more expensive  
**Time Saved:** 30-90 seconds  
**Difficulty:** Easy

**Implementation:**
- Change Stage 2 from `gemini-2.5-pro` to `gemini-2.5-flash`
- Flash model is 3-5x faster with similar quality for this use case

**Code Changes Needed:**
```python
# In get_feedback_from_gpt() - line 1631
response_B = client.models.generate_content(
    model="gemini-2.5-flash",  # Changed from gemini-2.5-pro
    contents=[prompt_B]
)

# In get_feedback_from_gpt_for_bowling() - line 732
response_B = client.models.generate_content(
    model="gemini-2.5-flash",  # Changed from gemini-2.5-pro
    contents=[prompt_B]
)
```

---

### 3. Optimize CSV Data Sent to Gemini
**Current Issue:** Sending full CSV as JSON string (line 1323, 394) - large payloads slow API calls  
**Time Saved:** 20-40 seconds  
**Difficulty:** Medium

**Implementation:**
- Summarize keypoint data instead of sending all frames
- Send only key frames (impact, follow-through, setup)
- Or send statistical summaries (min, max, mean, std) per keypoint

**Code Changes Needed:**
```python
# In get_feedback_from_gpt() - replace lines 1303-1323
def summarize_keypoints(keypoints_path):
    """Extract key frames and statistics instead of all frames"""
    df = pd.read_csv(keypoints_path)
    
    # Get key frames (first, middle, last, and frames with high motion)
    total_frames = len(df)
    key_frames = [
        0,  # Setup
        total_frames // 4,
        total_frames // 2,  # Mid-action
        (total_frames * 3) // 4,
        total_frames - 1  # Follow-through
    ]
    
    # Get statistics for each keypoint
    stats = {}
    for name in keypoints_names:
        x_col = f'{name}_x'
        y_col = f'{name}_y'
        if x_col in df.columns:
            stats[name] = {
                'x_mean': float(df[x_col].mean()),
                'x_std': float(df[x_col].std()),
                'y_mean': float(df[y_col].mean()),
                'y_std': float(df[y_col].std()),
                'key_frames': [
                    {
                        'frame': int(idx),
                        'x': float(df.iloc[idx][x_col]),
                        'y': float(df.iloc[idx][y_col]),
                        'conf': float(df.iloc[idx][f'{name}_conf'])
                    }
                    for idx in key_frames if idx < len(df)
                ]
            }
    
    return {
        'total_frames': total_frames,
        'fps': 30,  # Estimate or calculate
        'key_frames': [int(idx) for idx in key_frames if idx < len(df)],
        'statistics': stats
    }

# Then in get_feedback_from_gpt():
csv_summary = summarize_keypoints(keypoint_csv_path)
csv_json = json.dumps(csv_summary)  # Much smaller payload
```

---

## ⚡ PRIORITY 2: Medium-Impact Optimizations (Save 1-2 minutes)

### 4. Frame Sampling for Pose Extraction
**Current Issue:** Processing every frame (line 1076-1112) - unnecessary for most videos  
**Time Saved:** 30-60 seconds  
**Difficulty:** Easy

**Implementation:**
- Sample every 2nd or 3rd frame for 30fps videos
- Interpolate keypoints for skipped frames
- For 60fps videos, sample every 3rd-4th frame

**Code Changes Needed:**
```python
# In extract_pose_keypoints() - modify frame loop
def extract_pose_keypoints(video_path, player_type, frame_skip=2):
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    
    # Determine frame skip based on FPS
    if fps >= 50:
        frame_skip = 3
    elif fps >= 30:
        frame_skip = 2
    else:
        frame_skip = 1
    
    all_keypoints, frame_idx = [], 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Only process every Nth frame
        if frame_idx % frame_skip == 0:
            img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            keypoints = detect_pose(img_rgb)
            # ... rest of processing ...
            all_keypoints.append(row)
        
        frame_idx += 1
    
    # Interpolate missing frames
    # ... interpolation logic ...
```

---

### 5. Parallelize Frame Processing
**Current Issue:** Processing frames sequentially (line 1081)  
**Time Saved:** 20-40 seconds  
**Difficulty:** Medium

**Implementation:**
- Use multiprocessing to process frames in batches
- Process 4-8 frames in parallel

**Code Changes Needed:**
```python
from multiprocessing import Pool
import functools

def process_frame_batch(args):
    frame_idx, frame, detect_pose_func, keypoints_names, width, height, scale, pad_x, pad_y = args
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    keypoints = detect_pose_func(img_rgb)
    
    row = {'frame': frame_idx}
    for idx, name in enumerate(keypoints_names):
        # ... coordinate conversion ...
        row[f'{name}_x'] = x_final_norm
        row[f'{name}_y'] = y_final_norm
        row[f'{name}_conf'] = conf
    return row

# In extract_pose_keypoints():
frames_to_process = []
frame_idx = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break
    frames_to_process.append((frame_idx, frame, detect_pose, keypoints_names, width, height, scale, pad_x, pad_y))
    frame_idx += 1

# Process in parallel
with Pool(processes=4) as pool:
    all_keypoints = pool.map(process_frame_batch, frames_to_process)
```

---

### 6. Add Request Timeout and Retry Logic
**Current Issue:** No timeout on Gemini API calls - can hang indefinitely  
**Time Saved:** Prevents long delays on failures  
**Difficulty:** Easy

**Code Changes Needed:**
```python
import time
from functools import wraps

def retry_with_timeout(max_retries=2, timeout=60):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    start_time = time.time()
                    result = func(*args, **kwargs)
                    elapsed = time.time() - start_time
                    if elapsed > timeout:
                        logger.warning(f"{func.__name__} took {elapsed}s, exceeded timeout")
                    return result
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    logger.warning(f"{func.__name__} failed, retrying...")
                    time.sleep(1)
        return wrapper
    return decorator

@retry_with_timeout(max_retries=2, timeout=60)
def get_gemini_response(model, contents):
    return client.models.generate_content(model=model, contents=contents)
```

---

## 🔧 PRIORITY 3: Quick Wins (Save 30-60 seconds)

### 7. Cache Results for Identical Videos
**Current Issue:** Re-processing same videos  
**Time Saved:** Near-instant for cached videos  
**Difficulty:** Easy

**Code Changes Needed:**
```python
import hashlib

def get_video_hash(filepath):
    """Generate hash of video file"""
    hash_md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

# In api_upload_file():
video_hash = get_video_hash(filepath)
cache_key = f"{video_hash}_{player_type}_{shot_type if player_type == 'batsman' else bowler_type}"

# Check cache
cache_file = os.path.join(user_folder, f"cache_{cache_key}.json")
if os.path.exists(cache_file):
    logger.info("Returning cached results")
    with open(cache_file, 'r') as f:
        return jsonify(json.load(f))

# ... process video ...

# Save to cache
with open(cache_file, 'w') as f:
    json.dump(results, f)
```

---

### 8. Optimize Video I/O
**Current Issue:** Reading entire video multiple times  
**Time Saved:** 10-20 seconds  
**Difficulty:** Easy

**Code Changes Needed:**
```python
# Cache video properties
video_props = {
    'fps': int(cap.get(cv2.CAP_PROP_FPS)) or 30,
    'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
    'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
    'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
}

# Save to file for reuse
props_file = filepath + '.props.json'
with open(props_file, 'w') as f:
    json.dump(video_props, f)
```

---

### 9. Reduce Logging Overhead
**Current Issue:** Excessive logging during processing  
**Time Saved:** 5-10 seconds  
**Difficulty:** Easy

**Code Changes Needed:**
```python
# Change log level for verbose operations
logger.setLevel(logging.WARNING)  # During processing
# ... process ...
logger.setLevel(logging.INFO)  # After processing
```

---

## 📊 Implementation Priority

### Phase 1 (Immediate - Biggest Impact):
1. ✅ Make annotated video optional/async (#1) - **Saves 1-2 min**
2. ✅ Use gemini-2.5-flash for Stage 2 (#2) - **Saves 30-90 sec**
3. ✅ Optimize CSV data (#3) - **Saves 20-40 sec**

**Total Phase 1 Savings: 1.5-3 minutes**

### Phase 2 (Short-term):
4. ✅ Frame sampling (#4) - **Saves 30-60 sec**
5. ✅ Add caching (#7) - **Saves time on repeats**
6. ✅ Add timeout/retry (#6) - **Prevents hangs**

**Total Phase 2 Savings: 30-60 seconds**

### Phase 3 (Long-term):
7. ✅ Parallelize frame processing (#5) - **Saves 20-40 sec**
8. ✅ Optimize video I/O (#8) - **Saves 10-20 sec**

---

## 🎯 Expected Results

**Before Optimization:** 5-7 minutes  
**After Phase 1:** 2.5-4 minutes (40-50% reduction)  
**After Phase 2:** 2-3.5 minutes (50-60% reduction)  
**After Phase 3:** 1.5-3 minutes (60-70% reduction)

---

## ⚠️ Important Notes

1. **Test each optimization separately** - Don't implement all at once
2. **Monitor API costs** - Using flash model saves money too
3. **Frontend changes needed** - For async annotated video, add polling/status endpoint
4. **Backward compatibility** - Keep old behavior as fallback
5. **Error handling** - Ensure optimizations don't break existing functionality

---

## 🔍 Monitoring

Add timing logs to measure impact:
```python
import time

start_time = time.time()
# ... operation ...
elapsed = time.time() - start_time
logger.info(f"Operation took {elapsed:.2f} seconds")
```

