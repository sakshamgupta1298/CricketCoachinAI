# CrickCoach - Detailed Project Explanation

## Overview

**CrickCoach** is an AI-powered mobile application that provides comprehensive cricket technique analysis for both batsmen and bowlers. The system uses a combination of deep learning models, computer vision, and natural language processing to analyze cricket videos and provide personalized coaching feedback.

---

## What We Are Doing

CrickCoach analyzes cricket videos through a multi-stage AI pipeline:

1. **Video Upload**: Users upload or record videos of their cricket performance (batting or bowling)
2. **Action Recognition**: Identifies the specific cricket shot (for batsmen) or bowling style
3. **Pose Detection**: Extracts body keypoints and movement patterns from every frame
4. **Biomechanical Analysis**: Computes technical metrics (angles, distances, velocities)
5. **AI-Powered Feedback**: Generates detailed coaching feedback using GPT-4
6. **Training Plan Generation**: Creates personalized practice schedules

---

## Models Used in the System

The system uses **three main AI models** working together:

### 1. **SlowFast R50 (PyTorch) - Shot Prediction Model**

**What it is:**
- A deep learning video classification model based on the SlowFast architecture
- Pre-trained on cricket video data to recognize different batting shots
- Uses a dual-pathway architecture (slow and fast pathways) to capture both spatial and temporal information

**What it does:**
- **Input**: Cricket video file (MP4, AVI, MOV, MKV)
- **Process**:
  - Extracts 32 frames from the video (randomly sampled if video has more than 32 frames)
  - Resizes each frame to 224x224 pixels
  - Normalizes pixel values
  - Processes frames through two pathways:
    - **Slow pathway**: Processes every 4th frame to capture long-term temporal patterns
    - **Fast pathway**: Processes all frames to capture rapid movements
  - Combines features from both pathways
- **Output**: Predicts the cricket shot type
  - Currently supports: `coverdrive` or `pull_shot`
  - Returns one of these two shot classifications

**Technical Details:**
- Model file: `slowfast_cricket.pth` (downloaded from Google Drive if not present)
- Framework: PyTorch with PyTorchVideo
- Architecture: ResNet-50 backbone with SlowFast dual pathways
- Input shape: [batch_size, channels, frames, height, width]
- Output: Binary classification (2 classes)

**Code Location:**
- Model loading: `backend_script.py` lines 183-188
- Prediction function: `backend_script.py` lines 199-247
- Initialization: `backend_script.py` lines 158-164

---

### 2. **MoveNet Thunder (TensorFlow) - Pose Detection Model**

**What it is:**
- Google's state-of-the-art pose estimation model
- Specifically the "Thunder" variant optimized for accuracy
- Detects 17 body keypoints in real-time

**What it does:**
- **Input**: Individual video frames (RGB images)
- **Process**:
  - Resizes each frame to 256x256 pixels with padding
  - Processes through the MoveNet Thunder model
  - Detects 17 body keypoints with confidence scores
- **Output**: For each frame, returns:
  - 17 keypoints with (x, y, confidence) coordinates:
    1. nose
    2. left_eye, right_eye
    3. left_ear, right_ear
    4. left_shoulder, right_shoulder
    5. left_elbow, right_elbow
    6. left_wrist, right_wrist
    7. left_hip, right_hip
    8. left_knee, right_knee
    9. left_ankle, right_ankle

**Technical Details:**
- Model source: TensorFlow Hub (`httpss://tfhub.dev/google/movenet/singlepose/thunder/4`)
- Framework: TensorFlow
- Input: RGB image tensor [1, 256, 256, 3]
- Output: Keypoint tensor [1, 1, 17, 3] (x, y, confidence)
- Processing: Applied to every frame of the video

**Code Location:**
- Model loading: `backend_script.py` lines 162-163
- Keypoint extraction: `backend_script.py` lines 332-361
- Keypoint names: `backend_script.py` line 124

---

### 3. **GPT-4o (OpenAI) - Coaching Feedback Generator**

**What it is:**
- OpenAI's GPT-4o (GPT-4 Optimized) large language model
- Fine-tuned for understanding biomechanical data and cricket coaching

**What it does:**
- **Input**: 
  - CSV file containing pose keypoints for all video frames
  - Shot type (for batting) or bowler type (for bowling)
  - Player side (left/right)
- **Process**:
  - Uploads keypoint CSV to OpenAI's file storage
  - Sends a detailed prompt with cricket coaching context
  - Analyzes biomechanical patterns
  - Compares against ideal cricket technique benchmarks
- **Output**: Comprehensive JSON feedback containing:
  - **Analysis**: Overall technique assessment
  - **Biomechanical Features**: Detailed metrics (backlift angle, stride length, torso rotation, etc.)
  - **Flaws**: Specific technical issues with:
    - Feature name
    - Observed value
    - Expected range
    - Issue description
    - Recommendation for improvement
  - **Injury Risks**: Potential injury concerns based on biomechanics
  - **General Tips**: Actionable coaching advice

**Technical Details:**
- API: OpenAI Chat Completions API
- Model: `gpt-4o`
- Temperature: 0.3 (for consistent, focused responses)
- Response format: JSON object
- File handling: Uses OpenAI's file upload API for CSV data

**Code Location:**
- Batting feedback: `backend_script.py` lines 502-553
- Bowling feedback: `backend_script.py` lines 249-329
- Training plan generation: `backend_script.py` lines 556-633

---

## Complete Workflow

### Step-by-Step Process:

#### **1. User Upload (Frontend)**
- User selects player type (batsman/bowler)
- User selects player side (left/right)
- User uploads/records video
- Video is sent to backend via `/api/upload` endpoint

#### **2. Video Processing (Backend)**

**For Batsmen:**
1. **Shot Prediction** (SlowFast R50):
   - Extracts 32 frames from video
   - Processes through SlowFast model
   - Predicts shot type: `coverdrive` or `pull_shot`

2. **Pose Extraction** (MoveNet Thunder):
   - Processes every frame of the video
   - Extracts 17 body keypoints per frame
   - Saves to CSV: `batting_keypoints.csv`

3. **Feature Computation**:
   - Calculates biomechanical metrics:
     - Backlift angle (elbow-shoulder-wrist)
     - Stride length ratio
     - Torso rotation
     - Swing path variance
     - Head lateral displacement
   - Saves to CSV: `batting_summary_stats.csv`

4. **AI Feedback** (GPT-4o):
   - Uploads keypoint CSV to OpenAI
   - Sends prompt with shot type and coaching context
   - Receives detailed biomechanical analysis

**For Bowlers:**
1. **Pose Extraction** (MoveNet Thunder):
   - Same process as batsmen
   - Saves to CSV: `bowling_keypoints.csv`

2. **Feature Computation**:
   - Calculates bowling-specific metrics:
     - Run-up speed
     - Delivery stride
     - Follow-through analysis
   - Saves to CSV: `bowling_summary_stats.csv`

3. **AI Feedback** (GPT-4o):
   - Uploads keypoint CSV to OpenAI
   - Sends prompt with bowler type (fast_bowler/spin_bowler)
   - Receives detailed bowling analysis

#### **3. Report Generation**
- Creates comprehensive text report
- Includes all analysis results
- Saves as: `report_{player_type}_{timestamp}.txt`

#### **4. Results Return (Frontend)**
- JSON response with:
  - Player type
  - Shot/bowling type
  - GPT feedback (analysis, flaws, tips)
  - Report path
- User views results in ResultsScreen

#### **5. Training Plan Generation (Optional)**
- User can request personalized training plan
- GPT-4o generates multi-day practice schedule
- Includes warmup, drills, progression, and notes

---

## Technical Architecture

### Backend Stack:
- **Framework**: Flask (Python)
- **ML Framework**: PyTorch, TensorFlow
- **Computer Vision**: OpenCV
- **AI API**: OpenAI GPT-4o
- **Database**: SQLite (for user authentication)
- **Authentication**: JWT tokens with bcrypt password hashing

### Frontend Stack:
- **Framework**: React Native with Expo
- **UI Library**: React Native Paper (Material Design 3)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **https Client**: Axios

### Data Flow:
```
Mobile App → Flask Backend → AI Models → OpenAI API → Results → Mobile App
```

---

## Key Features

### 1. **Multi-Model Pipeline**
- Combines video classification, pose estimation, and language models
- Each model handles a specific aspect of analysis

### 2. **Biomechanical Analysis**
- Computes precise angles, distances, and movement patterns
- Compares against cricket coaching benchmarks
- Identifies specific technical flaws

### 3. **Personalized Feedback**
- GPT-4o provides context-aware coaching advice
- Tailored to specific shot types and player characteristics
- Includes actionable recommendations

### 4. **Training Plan Generation**
- Creates structured practice schedules
- Addresses identified weaknesses
- Includes warmup, drills, and progression

### 5. **Progress Tracking**
- Stores analysis history
- Allows comparison over time
- Tracks improvement progress

---

## Model Integration Details

### How Models Work Together:

1. **SlowFast R50** identifies WHAT action is being performed
   - This context is crucial for GPT-4o to provide relevant feedback
   - Different shots have different ideal biomechanics

2. **MoveNet Thunder** extracts HOW the body moves
   - Provides raw data about body positioning
   - Enables calculation of biomechanical features

3. **Feature Computation** bridges raw keypoints to meaningful metrics
   - Converts 17 keypoints per frame into cricket-specific measurements
   - Calculates angles, distances, and movement patterns

4. **GPT-4o** interprets and explains the data
   - Understands cricket coaching principles
   - Compares observed values to ideal ranges
   - Provides human-readable feedback and recommendations

---

## Example Analysis Flow

### For a Cover Drive Shot:

1. **Video uploaded**: `batsman_cover_drive.mp4`

2. **SlowFast predicts**: `coverdrive`

3. **MoveNet extracts keypoints**:
   ```
   Frame 0: nose(0.5, 0.3, 0.9), left_shoulder(0.4, 0.4, 0.95), ...
   Frame 1: nose(0.51, 0.31, 0.9), left_shoulder(0.41, 0.41, 0.95), ...
   ... (for all frames)
   ```

4. **Features computed**:
   - Backlift angle: 158.4° (expected: 45-65°)
   - Stride length ratio: 0.85 (expected: 0.7-0.9)
   - Torso rotation: 12.3° (expected: 15-25°)

5. **GPT-4o analyzes**:
   - Identifies: "Backlift too high for cover drive"
   - Recommends: "Use mirror drill to restrict backlift"
   - Provides general tips for improvement

6. **Results returned**:
   ```json
   {
     "player_type": "batsman",
     "shot_type": "coverdrive",
     "gpt_feedback": {
       "analysis": "Overall technique analysis...",
       "flaws": [
         {
           "feature": "backlift_angle",
           "observed": 158.4,
           "expected_range": "45-65",
           "issue": "Too high for cover drive",
           "recommendation": "Use mirror drill to restrict backlift"
         }
       ],
       "general_tips": ["Improve head stability", "Use shadow practice"]
     }
   }
   ```

---

## Performance Considerations

### Model Loading:
- Models are loaded once at server startup
- Stored in global variables for reuse
- Reduces latency for subsequent requests

### Video Processing:
- Frames are processed sequentially
- MoveNet processes every frame (can be optimized with frame skipping)
- SlowFast only needs 32 frames (efficient)

### API Calls:
- OpenAI API calls are asynchronous
- CSV files are uploaded once and referenced
- Response time depends on video length and GPT processing

---

## Future Enhancements

### Potential Improvements:
1. **More Shot Types**: Expand SlowFast to recognize more cricket shots
2. **Real-time Analysis**: Process video frames in real-time
3. **3D Pose Estimation**: Add depth information for better analysis
4. **Custom Model Training**: Fine-tune models on specific player data
5. **Multi-player Analysis**: Analyze team dynamics and coordination
6. **Video Comparison**: Compare current technique to previous sessions
7. **Augmented Reality**: Overlay feedback directly on video

---

## Security & Privacy

- **Authentication**: JWT tokens for secure API access
- **Password Hashing**: bcrypt for secure password storage
- **File Management**: Secure file uploads with validation
- **User Isolation**: Each user can only access their own analysis results
- **Data Cleanup**: Old files are automatically deleted after 24 hours

---

## Conclusion

CrickCoach represents a sophisticated integration of multiple AI technologies:
- **Computer Vision** (SlowFast, MoveNet) for understanding video content
- **Biomechanical Analysis** for extracting meaningful metrics
- **Natural Language Processing** (GPT-4o) for generating human-readable feedback

The system provides professional-level cricket coaching analysis accessible through a mobile app, making advanced biomechanical analysis available to players at all skill levels.


