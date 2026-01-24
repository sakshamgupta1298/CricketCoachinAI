import os
import json
import torch
import torch.nn as nn
import cv2
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from google import genai
import csv
from torchvision import transforms as T
from pytorchvideo.models.hub import slowfast_r50
import tensorflow as tf
import tensorflow_hub as hub
import re
from datetime import datetime, timedelta
import logging
import time
import jwt
import bcrypt
import sqlite3
from functools import wraps
import gdown
import glob
import threading
import uuid
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import string

# ==================== LOGGING CONFIGURATION ====================
# Create logging directory if it doesn't exist
LOG_DIR = 'logging'
os.makedirs(LOG_DIR, exist_ok=True)

# Configure logging with date and time
log_filename = os.path.join(LOG_DIR, f'backend_{datetime.now().strftime("%Y%m%d")}.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
    handlers=[
        logging.FileHandler(log_filename, encoding='utf-8'),
        logging.StreamHandler()  # Also log to console
    ]
)

# Get logger for this module
logger = logging.getLogger(__name__)
logger.info("=" * 80)
logger.info("CrickCoach Backend Application Starting")
logger.info(f"Log file: {log_filename}")
logger.info("=" * 80)

app = Flask(__name__)
app.secret_key = 'cricket_shot_prediction_secret_key'

# JWT Configuration
JWT_SECRET_KEY = 'your-super-secret-jwt-key-change-in-production'
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Database Configuration
DATABASE_PATH = 'cricket_coach.db'

# SMTP2GO Configuration
SMTP_HOST = 'mail.smtp2go.com'
SMTP_PORT = '2525'
SMTP_USER = 'elevateai.co.in'
SMTP_PASSWORD = '2btuslti469KsVv7'
FROM_EMAIL = 'CrickCoach AI <noreply@crickcoachai.com>'

# OTP Storage (in-memory with expiration)
# Format: {email: {'otp': '123456', 'expires_at': datetime, 'verified': False}}
otp_storage = {}
OTP_EXPIRATION_MINUTES = 10
OTP_LENGTH = 6

# Enable CORS for mobile app with more specific configuration
CORS(app, 
     origins=['*'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'User-Agent'],
     supports_credentials=False,  # Changed to False to avoid conflicts with wildcard origins
     max_age=86400)

# Database Functions
def init_database():
    """Initialize the database with users table"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def normalize_feature(name: str) -> str:
    return name.lower().strip()


# JWT Functions
def generate_jwt_token(user_id, username):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token):
    """Verify JWT token and return user data"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Authentication Decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return jsonify({'error': 'Authorization header missing'}), 401
        
        try:
            token = auth_header.split(' ')[1]  # Bearer <token>
            payload = verify_jwt_token(token)
            
            if not payload:
                return jsonify({'error': 'Invalid or expired token'}), 401
            
            # Add user info to request
            request.user = payload
            return f(*args, **kwargs)
            
        except IndexError:
            return jsonify({'error': 'Invalid authorization header format'}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
    
    return decorated_function

# Global model variables - loaded once at startup
# shot_prediction_model = None  # Commented out - users will select shot type manually
pose_detection_model = None
movenet_signature = None
keypoints_names = ["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]
# keypoints_names = [
#     # Head & Spine
#     "head_top", "forehead", "chin",
#     "c7_spine", "t12_spine", "l5_spine", "sternum",

#     # Shoulders & Arms
#     "left_shoulder", "right_shoulder",
#     "left_elbow", "right_elbow",
#     "left_wrist", "right_wrist",
#     "left_hand_thumb", "left_hand_index",
#     "right_hand_thumb", "right_hand_index",

#     # Pelvis
#     "pelvis_center",
#     "left_asis", "right_asis",
#     "left_psis", "right_psis",

#     # Lower body
#     "left_hip", "right_hip",
#     "left_knee", "right_knee",
#     "left_ankle", "right_ankle",
#     "left_heel", "right_heel",
#     "left_toe", "right_toe"
# ]


# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}
JOBS_SUBFOLDER = 'jobs'

def get_user_upload_folder(user_id):
    """
    Get the upload folder path for a specific user.
    Creates the folder if it doesn't exist.
    
    Args:
        user_id: The user ID
    
    Returns:
        Path to the user's upload folder
    """
    user_folder = os.path.join(UPLOAD_FOLDER, str(user_id))
    os.makedirs(user_folder, exist_ok=True)
    return user_folder

def get_user_jobs_folder(user_id):
    """Get or create a per-user jobs folder"""
    user_folder = get_user_upload_folder(user_id)
    jobs_folder = os.path.join(user_folder, JOBS_SUBFOLDER)
    os.makedirs(jobs_folder, exist_ok=True)
    return jobs_folder

def _job_file_path(user_id, job_id):
    return os.path.join(get_user_jobs_folder(user_id), f"job_{job_id}.json")

def save_job(user_id, job):
    """Persist job state to disk (per-user)."""
    job_id = job.get("job_id")
    if not job_id:
        raise ValueError("job missing job_id")
    with open(_job_file_path(user_id, job_id), "w") as f:
        json.dump(job, f, indent=2, default=str)

def load_job(user_id, job_id):
    path = _job_file_path(user_id, job_id)
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)

def send_expo_push(expo_push_token, title, body, data=None):
    """
    Send a push notification via Expo Push API.
    This allows users on Expo Go to be notified when the backend job finishes.
    """
    try:
        if not expo_push_token:
            return
        payload = {
            "to": expo_push_token,
            "title": title,
            "body": body,
            "data": data or {},
            "sound": "default",
        }
        logger.info(f"📣 [PUSH] Sending push to token: {str(expo_push_token)[:30]}...")
        resp = requests.post(
            "https://exp.host/--/api/v2/push/send",
            json=payload,
            timeout=10,
        )
        try:
            resp_json = resp.json()
        except Exception:
            resp_json = None

        logger.info(f"📣 [PUSH] Expo push response: {resp.status_code} {resp.text[:500]}")
        if resp_json:
            logger.info(f"📣 [PUSH] Expo push response JSON: {json.dumps(resp_json)[:800]}")
    except Exception as e:
        logger.error(f"❌ [PUSH] Failed to send Expo push: {str(e)}", exc_info=True)

def process_analysis_job(job_id, user_id, username, filepath, filename, form, expo_push_token=None):
    """
    Background worker that runs the heavy analysis and stores results keyed by job_id.
    Runs server-side so it continues even if the mobile app is backgrounded/closed.
    """
    try:
        job = load_job(user_id, job_id) or {}
        job.update({
            "job_id": job_id,
            "status": "processing",
            "updated_at": datetime.utcnow().isoformat() + "Z",
        })
        save_job(user_id, job)

        player_type = form.get("player_type", "batsman")

        results = None
        user_folder = get_user_upload_folder(user_id)

        if player_type == "batsman":
            shot_type = (form.get("shot_type", "") or "").strip()
            if not shot_type:
                raise ValueError("Shot type is required. Please select a shot type.")

            batter_side = form.get("batter_side", "right")

            logger.info(f"🎬 [JOB {job_id}] Batting analysis started for {filename}")
            keypoints_path, annotated_video_path = extract_pose_keypoints(filepath, "batting")
            _ = compute_features(keypoints_path, batter_side, "batting")
            try:
                gpt_feedback = get_feedback_from_gpt(shot_type, keypoints_path)
            except Exception as e:
                logger.error(f"❌ [JOB {job_id}] Error in Gemini feedback: {str(e)}", exc_info=True)
                gpt_feedback = "Unable to generate feedback at this time."

            results = {
                "success": True,
                "job_id": job_id,
                "user_id": user_id,
                "username": username,
                "player_type": "batsman",
                "shot_type": shot_type,
                "batter_side": batter_side,
                "gpt_feedback": gpt_feedback,
                "filename": filename,
                "annotated_video_path": annotated_video_path,
            }

            try:
                report_path = generate_report(results, "batsman", shot_type, batter_side, None, None, filename, user_id=user_id)
                results["report_path"] = report_path
            except Exception as e:
                logger.error(f"❌ [JOB {job_id}] Error generating report: {str(e)}", exc_info=True)
                results["report_path"] = None

        else:
            bowler_side = form.get("bowler_side", "right")
            bowler_type = form.get("bowler_type", "fast_bowler")

            logger.info(f"🎬 [JOB {job_id}] Bowling analysis started for {filename}")
            keypoints_path, annotated_video_path = extract_pose_keypoints(filepath, "bowling")
            _ = compute_features(keypoints_path, bowler_side, "bowling")
            try:
                gpt_feedback = get_feedback_from_gpt_for_bowling(keypoints_path, bowler_type)
            except Exception as e:
                logger.error(f"❌ [JOB {job_id}] Error in Gemini feedback: {str(e)}", exc_info=True)
                gpt_feedback = "Unable to generate feedback at this time."

            results = {
                "success": True,
                "job_id": job_id,
                "user_id": user_id,
                "username": username,
                "player_type": "bowler",
                "bowler_side": bowler_side,
                "bowler_type": bowler_type,
                "gpt_feedback": gpt_feedback,
                "filename": filename,
                "annotated_video_path": annotated_video_path,
            }

            try:
                report_path = generate_report(results, "bowler", None, None, bowler_side, bowler_type, filename, user_id=user_id)
                results["report_path"] = report_path
            except Exception as e:
                logger.error(f"❌ [JOB {job_id}] Error generating report: {str(e)}", exc_info=True)
                results["report_path"] = None

        # Save results by filename for history/backwards compatibility
        results_file = os.path.join(user_folder, f"results_{filename}.json")
        with open(results_file, "w") as f:
            json.dump(results, f, indent=2)

        job = load_job(user_id, job_id) or {}
        job.update({
            "job_id": job_id,
            "status": "completed",
            "result": results,
            "result_filename": filename,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        })
        save_job(user_id, job)

        send_expo_push(
            expo_push_token,
            title="CrickCoach: Analysis ready",
            body="Tap to view your results.",
            data={"job_id": job_id, "filename": filename},
        )

        logger.info(f"✅ [JOB {job_id}] Completed successfully for {filename}")
    except Exception as e:
        logger.error(f"❌ [JOB {job_id}] Failed: {str(e)}", exc_info=True)
        job = load_job(user_id, job_id) or {}
        job.update({
            "job_id": job_id,
            "status": "failed",
            "error": str(e),
            "updated_at": datetime.utcnow().isoformat() + "Z",
        })
        save_job(user_id, job)
        send_expo_push(
            expo_push_token,
            title="CrickCoach: Analysis failed",
            body="There was an error processing your video.",
            data={"job_id": job_id, "filename": filename, "error": str(e)},
        )

# Model configuration
MODEL_PATH = "slowfast_cricket.pth"
FILE_ID = "1SRsNEUv4a4FLisMZGM0-BH1J4RlqT0HN"
DOWNLOAD_URL = f"https://drive.google.com/uc?id={FILE_ID}"

# Automatically download the model if it's missing
if not os.path.exists(MODEL_PATH):
    logger.info("Model not found locally. Downloading from Google Drive...")
    gdown.download(DOWNLOAD_URL, MODEL_PATH, quiet=False)
    logger.info(f"Model downloaded successfully to {MODEL_PATH}")

CHECKPOINT_PATH = MODEL_PATH
# BATTER_SIDE = "right"

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Gemini client
client = genai.Client(api_key="AIzaSyCNmpg89-pwOyrimMEmgyt4aT9d07MzYYc")

# Transform for video frames
transform = T.Compose([
    T.ToPILImage(),
    T.Resize((224, 224)),
    T.ToTensor(),
    T.Normalize(mean=[0.45, 0.45, 0.45], std=[0.225, 0.225, 0.225]),
])

def initialize_models():
    # global shot_prediction_model, pose_detection_model, movenet_signature  # shot_prediction_model commented out
    global pose_detection_model, movenet_signature
    logger.info("Initializing models...")
    # shot_prediction_model = load_model()  # Commented out - users will select shot type manually
    # logger.info("Shot prediction model loaded successfully")
    pose_detection_model = hub.load("https://tfhub.dev/google/movenet/singlepose/thunder/4")
    movenet_signature = pose_detection_model.signatures['serving_default']
    logger.info("Pose detection model loaded successfully")
    logger.info("All models initialized successfully!")

# def get_shot_prediction_model():
#     global shot_prediction_model
#     if shot_prediction_model is None:
#         logger.warning("Shot prediction model not initialized, loading now...")
#         shot_prediction_model = load_model()
#         logger.info("Shot prediction model loaded")
#     return shot_prediction_model
# Commented out - users will select shot type manually

def get_pose_detection_model():
    global pose_detection_model
    if pose_detection_model is None:
        logger.warning("Pose detection model not initialized, loading now...")
        pose_detection_model = hub.load("https://tfhub.dev/google/movenet/singlepose/thunder/4")
        logger.info("Pose detection model loaded")
    return pose_detection_model

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_model(num_classes=2, checkpoint_path=CHECKPOINT_PATH):
    logger.info(f"Loading model from: {checkpoint_path}")
    if not os.path.exists(checkpoint_path):
        logger.error(f"Model checkpoint not found at: {checkpoint_path}")
        raise FileNotFoundError(f"Model checkpoint not found at: {checkpoint_path}")
    
    model = slowfast_r50(pretrained=False)
    model.blocks[-1].proj = nn.Linear(model.blocks[-1].proj.in_features, num_classes)
    
    try:
        checkpoint = torch.load(checkpoint_path, map_location="cpu")
        model.load_state_dict(checkpoint)
        logger.info("Model state dict loaded successfully")
    except Exception as e:
        logger.error(f"Error loading model checkpoint: {e}", exc_info=True)
        raise
    
    model.eval()
    logger.info(f"Model set to eval mode. Model device: CPU")
    logger.info(f"Model output classes: {num_classes}")
    return model

def cleanup_old_files(folder, max_age_hours=24):
    now = time.time()
    for filename in os.listdir(folder):
        filepath = os.path.join(folder, filename)
        if os.path.isfile(filepath):
            if now - os.path.getmtime(filepath) > max_age_hours * 3600:
                os.remove(filepath)
                logger.info(f"Deleted old file: {filepath}")

# def predict_shot(video_path, model):
#     logger.info(f"Starting shot prediction for video: {video_path}")
#     logger.debug(f"Model type: {type(model)}")
#     logger.debug(f"Model in eval mode: {not model.training}")
#     
#     cap = cv2.VideoCapture(video_path)
#     total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
#     logger.info(f"Total frames in video: {total_frames}")
#     
#     # Check if video has frames
#     if total_frames <= 0:
#         logger.error(f"Video file has no frames or is corrupted: {video_path}")
#         cap.release()
#         return 'coverdrive'  # Default fallback
#     
#     indices = sorted(torch.randperm(total_frames)[:32].tolist()) if total_frames >= 32 else list(range(total_frames)) + [total_frames - 1] * (32 - total_frames)
#     logger.debug(f"Selected frame indices: {indices[:5]}... (showing first 5)")
# 
#     frames, current_idx, idx_set = [], 0, set(indices)
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break
#         if current_idx in idx_set:
#             try:
#                 frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#                 frame = transform(frame)
#                 frames.append(frame)
#                 if len(frames) == len(indices):
#                     break
#             except Exception as e:
#                 logger.warning(f"Error processing frame {current_idx}: {e}")
#         current_idx += 1
#     cap.release()
#     
#     logger.info(f"Successfully extracted {len(frames)} frames")
# 
#     # Check if we extracted any frames
#     if not frames:
#         logger.error(f"No frames extracted from video: {video_path}")
#         return 'coverdrive'  # Default fallback
#     
#     # Check if we have enough frames
#     if len(frames) < 1:
#         logger.error(f"Insufficient frames extracted: {len(frames)}")
#         return 'coverdrive'  # Default fallback
# 
#     try:
#         logger.debug(f"Processing {len(frames)} frames for prediction")
#         frames = torch.stack(frames).permute(1, 0, 2, 3)
#         fast_pathway = frames
#         slow_pathway = frames[:, ::4, :, :]
#         inputs = [slow_pathway.unsqueeze(0), fast_pathway.unsqueeze(0)]
#         
#         logger.debug(f"Input shapes - Fast: {fast_pathway.shape}, Slow: {slow_pathway.shape}")
# 
#         with torch.no_grad():
#             outputs = model([inp for inp in inputs])
#             logger.debug(f"Model outputs: {outputs}")
#             logger.debug(f"Model output shape: {outputs.shape}")
#             logger.debug(f"Raw output values: {outputs.tolist()}")
#             
#             # Get probabilities using softmax
#             probs = torch.softmax(outputs, dim=1)
#             logger.info(f"Prediction probabilities - Coverdrive: {probs[0][0].item():.4f}, Pull Shot: {probs[0][1].item():.4f}")
#             
#             _, pred = torch.max(outputs, 1)
#             pred_value = pred.item()
#             logger.info(f"Predicted class index: {pred_value}")
#             
#             shot_type = ['coverdrive', 'pull_shot'][pred_value]
#             logger.info(f"Final prediction: {shot_type}")
#             return shot_type
#     except Exception as e:
#         logger.error(f"Error in shot prediction: {str(e)}", exc_info=True)
#         logger.error(f"Exception type: {type(e).__name__}")
#         import traceback
#         logger.error(f"Full traceback: {traceback.format_exc()}")
#         return 'coverdrive'  # Default fallback
# Commented out - users will select shot type manually

def get_feedback_from_gpt_for_bowling(keypoint_csv_path, bowler_type='fast_bowler', player_level='intermediate'):
    logger.info(f"Getting Gemini feedback for bowling type: {bowler_type}, player level: {player_level}")

    # Read CSV and convert to JSON
    data = []
    try:
        with open(keypoint_csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Convert numeric fields to float
                processed_row = {}
                for k, v in row.items():
                    try:
                        # Try to convert to float if it's numeric
                        processed_row[k] = float(v)
                    except ValueError:
                        # Keep as string if not numeric
                        processed_row[k] = v
                data.append(processed_row)
    except Exception as e:
        logger.error(f"Failed to read CSV file: {e}", exc_info=True)
        return {"error": "Failed to read CSV file", "raw_content": str(e)}
    
    csv_json = json.dumps(data)
    bowling_type = bowler_type.split("_")[0]
    logger.debug(f"Bowling type extracted: {bowling_type}")

# ================================
# PROMPT A — BIOMECHANICAL ANALYST (BOWLING)
# ================================

    prompt_A = f"""
    You are a **Cricket Biomechanics Analyst** specializing in bowling mechanics.

    Your responsibility is STRICTLY LIMITED to:
    - analyzing pose keypoint time-series data
    - computing biomechanical features
    - comparing them against established cricket bowling norms
    - reporting deviations and data confidence
    - assessing injury risk based on biomechanical deviations

    You are NOT a coach.
    You must NOT provide drills, cues, training advice, or subjective coaching opinions.

            ────────────────────────
            CONTEXT
            ────────────────────────
            Bowling Type: {bowling_type}   # fast | spin
            Bowler Style: {bowler_type}   # right-arm / left-arm / overarm / off-spin / leg-spin

            Each row of the input represents one video frame containing
            body joint coordinates.

            ────────────────────────
            INPUT DATA
            ────────────────────────
            {csv_json}

            ────────────────────────
            CRICKET NORM CONSTRAINT (CRITICAL)
            ────────────────────────
            All "ideal_range" values MUST be derived from **established cricket bowling norms**
            as defined in:
            - ICC fast & spin bowling coaching manuals
            - elite cricket academies
            - published bowling biomechanics research

            Do NOT invent generic athletic ranges.
            Do NOT use single ideal values — ALWAYS use ranges.
            Adjust ranges based on bowling type and style.

            ────────────────────────
            AUTO-FEATURE SELECTION LOGIC
            ────────────────────────
            1. Always compute CORE features supported by pose keypoints.
            2. Compute CONDITIONAL features only when motion clarity supports them.
            3. Infer ADVANCED features conservatively and mark them as "estimated".
            4. Do NOT fabricate metrics that require sensors not present
            (force plates, EMG, ball tracking).

            ────────────────────────
            FEATURE TIERS
            ────────────────────────

            ### TIER 1 — CORE (MANDATORY)
            - Run-up speed (estimated m/s)
            - Approach rhythm consistency
            - Trunk lean at delivery
            - Shoulder rotation angle
            - Hip–shoulder separation (X-factor)
            - Front knee flexion at front-foot contact
            - Front-foot stride length
            - Arm path plane (over-the-top / round-arm)
            - Release height consistency

    TIER 2 — CONDITIONAL
    - Run-up acceleration profile
    - Braking force at front-foot contact (inferred)
    - Pelvic rotation velocity
    - Bowling arm angular velocity
    - Follow-through momentum dissipation

    Mark all Tier 2 features with "confidence": "medium"

    TIER 3 — INFERRED
    - Wrist position at release
    - Seam orientation stability
    - Spin generation efficiency (spin bowlers)
    - Pace transfer efficiency (fast bowlers)
    - Kinetic chain sequencing quality

    Mark all Tier 3 features with "estimated": true

    ────────────────────────
    BOWLING-TYPE NORM ADJUSTMENT
    ────────────────────────
    Adjust interpretation based on bowling type:

    FAST BOWLING →
    - Higher run-up speed & stride length norms
    - Strong front-knee bracing norms
    - Larger hip–shoulder separation norms
    - Controlled trunk flexion norms

    SPIN BOWLING →
    - Moderate run-up speed norms
    - Upright trunk posture norms
    - Higher shoulder rotation control norms
    - Wrist-dominant release norms

    A deviation exists ONLY if values clearly fall outside
    acceptable norms for the given bowling type.

    ────────────────────────
    INJURY RISK ASSESSMENT
    ────────────────────────
    When flagging injury risk, relate it biomechanically to:
    - lumbar spine (hyperextension / lateral flexion)
    - shoulder complex (over-rotation / load)
    - elbow (especially for spinners)
    - knee and ankle (braking forces)

    Avoid over-alarmist language unless deviation is severe.
    Only flag injury risk if biomechanical deviation is significant.

    ────────────────────────
    ANALYSIS TASKS
    ────────────────────────
    1. Select valid biomechanical features using tier rules
    2. Compute or estimate realistic numeric values
    3. Compare against cricket bowling norm ranges
    4. Classify deviations without coaching interpretation
    5. Assess injury risk based on biomechanical deviations
    6. Report data quality and limitations

    ────────────────────────
    RULES (STRICT)
    ────────────────────────
    - Respond ONLY in valid JSON
    - No coaching language
    - No drills or recommendations
    - No null, NaN, or empty objects
    - Use realistic cricket bowling biomechanics values only

    ────────────────────────
    REQUIRED JSON OUTPUT
    ────────────────────────
    {{
    "analysis_summary": "Neutral biomechanical assessment based on cricket bowling norms",

    "data_quality": {{
        "frame_coverage": "percentage",
        "motion_clarity": "low | medium | high",
        "analysis_limitations": "explicit limitations based on data"
    }},

    "selected_features": {{
        "core": [],
        "conditional": [],
        "inferred": []
    }},

    "biomechanics": {{
        "core": {{}},
        "conditional": {{}},
        "inferred": {{}}
    }},

    "deviations": [
        {{
        "feature": "feature_name",
        "observed": 0.0,
        "ideal_range": "cricket-norm range",
        "deviation_type": "within_range | mild | significant",
        "biomechanical_note": "Mechanical difference only",
        "confidence": "high | medium"
        }}
    ],

    "injury_risk_assessment": [
        {{
        "body_part": "Lower back | Shoulder | Elbow | Knee | Ankle",
        "risk_level": "Low | Moderate | High",
        "reason": "Biomechanical cause linked to norm deviation"
        }}
    ]
    }}
    """

# ================================
# STAGE 1: BIOMECHANICAL ANALYSIS
# ================================
    logger.info("Stage 1: Running biomechanical analysis for bowling (Prompt A)...")
    try:
        response_A = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt_A]
        )

        raw_content_A = response_A.text
        try:
            json_text_A = re.search(r"\{.*\}", raw_content_A, re.DOTALL).group()
            biomechanics_report = json.loads(json_text_A)
            logger.info("Stage 1 completed: Biomechanical analysis received")
        except Exception as e:
            logger.error(f"Failed to parse Stage 1 (biomechanics) response: {e}", exc_info=True)
            return {
                "error": "Failed to parse biomechanics response", 
                "raw_content": raw_content_A,
                "stage": "biomechanics_analysis"
            }
    except Exception as e:
        logger.error(f"Failed to get Stage 1 (biomechanics) response: {e}", exc_info=True)
        return {
            "error": "Failed to get biomechanics response", 
            "raw_content": str(e),
            "stage": "biomechanics_analysis"
        }

# ================================
# STAGE 2: COACH INTERPRETATION (BOWLING)
# ================================
    logger.info("Stage 2: Running coach interpretation for bowling (Prompt B)...")

    
    
    # Convert biomechanics report to JSON string for prompt_B
    biomechanics_report_json = json.dumps(biomechanics_report, indent=2)
    logger.info(f"Biomechanics report: {biomechanics_report_json}")
    
    prompt_B = f"""
You are an **elite Cricket Bowling Coach** interpreting a biomechanics report.

Your role is to convert biomechanical deviations into
clear, practical, bowling-type-specific coaching guidance.

You do NOT recompute biomechanics.
You rely ONLY on the provided analysis.

────────────────────────
COACHING PHILOSOPHY
────────────────────────
- Coach like an elite academy instructor
- Prioritize fundamentals over micro-details
- Ignore deviations that do not affect bowling performance
- Be concise, actionable, and player-appropriate
- Consider bowling type (fast vs spin) in all recommendations

────────────────────────
INPUTS
────────────────────────
Bowling Type: {bowling_type}   # fast | spin
Bowler Style: {bowler_type}   # right-arm / left-arm / overarm / off-spin / leg-spin
Player Level: {player_level}   # beginner | intermediate | advanced | elite

Biomechanics Report (JSON):
{biomechanics_report_json}

────────────────────────
INTERPRETATION RULES (STRICT)
────────────────────────
- Only "significant and mild" deviations may become confirmed faults
- "Mild" deviations may be monitored, not corrected
- Inferred features may NOT be the primary reason for a fault
- Limit confirmed faults to a maximum of 10
- Injury risks should be addressed but not cause alarm unless High risk
- CRITICAL: For each flaw, you MUST include both "observed" (numeric value) and "ideal_range" (string range) from the Biomechanics Report
- Data Mapping: Carry over the 'observed' and 'ideal_range' values EXACTLY as they appear in the Biomechanics Report for the chosen faults

────────────────────────
SKILL-LEVEL ADAPTATION
────────────────────────
- Beginner → simple language, run-up rhythm & basic action focus
- Intermediate → standard technical cues
- Advanced / Elite → sequencing, efficiency, and fine-tuning

────────────────────────
BOWLING-TYPE ADAPTATION
────────────────────────
- Fast Bowling → focus on pace generation, run-up speed, front-foot bracing
- Spin Bowling → focus on wrist position, rotation control, release consistency

────────────────────────
COACHING TASKS
────────────────────────
1. Review deviations and data quality
2. Decide which deviations are true technical faults
3. Rank faults by impact on bowling performance
4. Provide ONE drill per fault using standardized format
5. Address injury risks with appropriate caution level
6. Reinforce strengths that should not be overcorrected

────────────────────────
DRILL FORMAT (MANDATORY)
────────────────────────
"Drill name — setup — execution cue — reps"

────────────────────────
RULES (STRICT)
────────────────────────
- Respond ONLY in valid JSON
- No biomechanics recalculation
- No contradiction of analysis confidence
- Use professional coaching language
- Bowling-type appropriate recommendations

────────────────────────
REQUIRED JSON OUTPUT
────────────────────────
{{
  "analysis_summary": "Comprehensive summary of the biomechanical analysis and coaching focus for this session. Include key findings, primary technical themes, and overall assessment.",

  "flaws": [
    {{
      "feature": "feature_name",
      "observed": <numeric_value_from_biomechanics_report>,  # REQUIRED: Must be a number from the deviations array
      "ideal_range": "<string_range_from_biomechanics_report>",  # REQUIRED: Must be the exact ideal_range string from the deviations array
      "issue": "Bowling-type-specific explanation of why this deviation matters",
      "recommendation": "Drill name — setup — execution cue — reps",
      "deviation": "Brief description of the deviation (optional, can be derived from observed vs ideal_range)"
    }}
  ],

  "injury_risk_assessment": [
    {{
      "body_part": "Lower back | Shoulder | Elbow | Knee | Ankle",
      "risk_level": "Low | Moderate | High",
      "reason": "Biomechanical explanation of why this body part is at risk"
    }}
  ],

  "general_tips": [
    "What to keep doing well",
    "What not to overcorrect",
    "Additional coaching tips and reminders"
  ]
}}
"""

    try:
        response_B = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt_B]
        )

        raw_content_B = response_B.text
        try:
            json_text_B = re.search(r"\{.*\}", raw_content_B, re.DOTALL).group()
            coaching_feedback = json.loads(json_text_B)
            logger.info("Stage 2 completed: Coaching feedback received")
        except Exception as e:
            logger.error(f"Failed to parse Stage 2 (coaching) response: {e}", exc_info=True)
            # Return biomechanics report even if coaching fails
            return {
                "biomechanics_report": biomechanics_report,
                "coaching_feedback": {"error": "Failed to parse coaching response", "raw_content": raw_content_B},
                "stage": "coaching_interpretation"
            }
    except Exception as e:
        logger.error(f"Failed to get Stage 2 (coaching) response: {e}", exc_info=True)
        # Return biomechanics report even if coaching fails
        return {
            "biomechanics_report": biomechanics_report,
            "coaching_feedback": {"error": "Failed to get coaching response", "raw_content": str(e)},
            "stage": "coaching_interpretation"
        }

    # Enrich flaws with missing ideal_range and observed from biomechanics report
    flaws = coaching_feedback.get("flaws", [])
    deviations = biomechanics_report.get("deviations", [])
    
    # Create a lookup map from feature name to deviation data
    # deviation_map = {}
    # for dev in deviations:
    #     feature_name = dev.get("feature", "")
    #     if feature_name:
    #         deviation_map[feature_name] = dev
    deviation_map = {
        normalize_feature(dev.get("feature", "")): dev
        for dev in deviations
    }
    
    # ALWAYS overwrite ideal_range and observed from biomechanics report to ensure data consistency
    # Prompt B may not reliably carry these values forward, so we enforce them from Prompt A
    # for flaw in flaws:
    #     feature_name = flaw.get("feature", "")
    #     if feature_name in deviation_map:
    #         dev = deviation_map[feature_name]
    #         # Always overwrite ideal_range from biomechanics report if it exists
    #         if dev.get("ideal_range"):
    #             flaw["ideal_range"] = dev.get("ideal_range")
    #             logger.info(f"Overwrote ideal_range for {feature_name} from biomechanics: {dev.get('ideal_range')}")
    #         elif "ideal_range" not in flaw or not flaw.get("ideal_range"):
    #             flaw["ideal_range"] = dev.get("ideal_range", "")
    #             logger.info(f"Filled missing ideal_range for {feature_name}: {dev.get('ideal_range', '')}")
    #         # Always overwrite observed from biomechanics report if it exists
    #         if dev.get("observed") is not None:
    #             flaw["observed"] = dev.get("observed")
    #             logger.info(f"Overwrote observed for {feature_name} from biomechanics: {dev.get('observed')}")
    #         elif "observed" not in flaw or flaw.get("observed") is None:
    #             flaw["observed"] = dev.get("observed")
    #             logger.info(f"Filled missing observed for {feature_name}: {dev.get('observed')}")

    for flaw in flaws:
        feature_name = normalize_feature(flaw.get("feature", ""))

        if feature_name not in deviation_map:
            continue

        dev = deviation_map[feature_name]

        # ✅ Only enforce biomechanics values if this is a real deviation
        if dev.get("deviation_type") in ("mild", "significant"):

            # Overwrite ideal_range ONLY for real deviations
            if dev.get("ideal_range"):
                flaw["ideal_range"] = dev["ideal_range"]
                logger.info(
                    f"Enforced ideal_range for {feature_name} from biomechanics: {dev['ideal_range']}"
                )

            # Overwrite observed ONLY for real deviations
            if dev.get("observed") is not None:
                flaw["observed"] = dev["observed"]
                logger.info(
                    f"Enforced observed for {feature_name} from biomechanics: {dev['observed']}"
                )


    # Simplified result - only fields that frontend actually uses'
    analysis_text = coaching_feedback.get("analysis_summary",biomechanics_report.get("analysis_summary", ""))
    combined_result = {
        # Analysis summary - from Prompt B (coaching), fallback to Prompt A (biomechanics)
        "analysis_summary": analysis_text,
        "analysis": analysis_text,  # Backward compatibility
        
        # Flaws - from Prompt B (coaching feedback), enriched with biomechanics data
        # Each flaw includes: feature, observed (numeric), ideal_range (string), issue, recommendation, deviation
        "flaws": flaws,
        "technical_flaws": flaws,  # Backward compatibility alias
        
        # General tips - from Prompt B (coaching feedback)
        "general_tips": coaching_feedback.get("general_tips", []),
        
        # Injury risks - combine from both reports (coaching_feedback takes priority)
        "injury_risk_assessment": (
            coaching_feedback.get("injury_risk_assessment", [])
        ),
        "injury_risks": [
            f"{risk.get('body_part', 'Unknown')} - {risk.get('risk_level', 'Unknown')}: {risk.get('reason', '')}"
            for risk in (coaching_feedback.get("injury_risk_assessment", []))
        ],
        
        # Biomechanics data from Prompt A (for collapsible section in frontend)
        "biomechanics": biomechanics_report.get("biomechanics", {})
    }
    
    # Verify that flaws include observed and ideal_range
    for flaw in combined_result.get("flaws", []):
        if "observed" not in flaw or "ideal_range" not in flaw:
            logger.warning(f"Flaw missing observed or ideal_range: {flaw.get('feature', 'unknown')}")
    
    logger.info("Two-stage bowling analysis completed successfully")
    logger.info("=" * 80)
    logger.info("COMBINED RESULT (BOWLING) - BEFORE RETURNING:")
    logger.info("=" * 80)
    logger.info(f"Number of flaws: {len(combined_result.get('flaws', []))}")
    for i, flaw in enumerate(combined_result.get("flaws", [])):
        logger.info(f"Flaw {i+1}: {json.dumps(flaw, indent=2, default=str)}")
    logger.info("=" * 80)
    logger.info(f"Full combined result: {json.dumps(combined_result, indent=2, default=str)}")
    logger.info("=" * 80)
    return combined_result


def draw_pose_skeleton(frame, keypoints, keypoints_names):
    """Draw pose skeleton on a frame"""
    # Define connections between keypoints (skeleton structure)
    # Format: (start_idx, end_idx) in keypoints_names
    connections = [
        # Face connections
        (0, 1), (0, 2), (1, 3), (2, 4),  # nose to eyes, eyes to ears
        # Upper body
        (5, 6),  # left_shoulder to right_shoulder
        (5, 7), (7, 9),  # left arm: shoulder -> elbow -> wrist
        (6, 8), (8, 10),  # right arm: shoulder -> elbow -> wrist
        # Torso
        (5, 11), (6, 12),  # shoulders to hips
        (11, 12),  # left_hip to right_hip
        # Lower body
        (11, 13), (13, 15),  # left leg: hip -> knee -> ankle
        (12, 14), (14, 16),  # right leg: hip -> knee -> ankle
    ]
    
    h, w = frame.shape[:2]
    
    # Draw connections (skeleton lines)
    for start_idx, end_idx in connections:
        if start_idx < len(keypoints) and end_idx < len(keypoints):
            start_kp = keypoints[start_idx]
            end_kp = keypoints[end_idx]
            
            # Check confidence threshold
            if start_kp[2] > 0.3 and end_kp[2] > 0.3:
                # Convert normalized coordinates to pixel coordinates
                start_x = int(start_kp[1] * w)
                start_y = int(start_kp[0] * h)
                end_x = int(end_kp[1] * w)
                end_y = int(end_kp[0] * h)
                
                # Draw line
                cv2.line(frame, (start_x, start_y), (end_x, end_y), (0, 255, 0), 2)
    
    # Draw keypoints (joints)
    for idx, kp in enumerate(keypoints):
        if kp[2] > 0.3:  # Confidence threshold
            x = int(kp[1] * w)
            y = int(kp[0] * h)
            cv2.circle(frame, (x, y), 4, (0, 0, 255), -1)
    
    return frame

def create_annotated_video(video_path, keypoints_path, player_type):
    """Create a video with pose detection overlay"""
    logger.info(f"🎬 [ANNOTATED_VIDEO] Starting creation from {video_path}")
    logger.info(f"🎬 [ANNOTATED_VIDEO] Keypoints path: {keypoints_path}")
    
    try:
        # Read keypoints CSV
        if not os.path.exists(keypoints_path):
            logger.error(f"🎬 [ANNOTATED_VIDEO] Keypoints file not found: {keypoints_path}")
            return None
        
        df = pd.read_csv(keypoints_path)
        logger.info(f"🎬 [ANNOTATED_VIDEO] Loaded {len(df)} keypoint frames")
        
        # Open original video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logger.error(f"🎬 [ANNOTATED_VIDEO] Failed to open video: {video_path}")
            return None
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30  # Default to 30 if fps is 0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        logger.info(f"🎬 [ANNOTATED_VIDEO] Video properties: fps={fps}, width={width}, height={height}, frames={frame_count}")
        
        if fps == 0 or width == 0 or height == 0:
            logger.error(f"🎬 [ANNOTATED_VIDEO] Invalid video properties: fps={fps}, width={width}, height={height}")
            cap.release()
            return None
        
        # Determine output path
        video_dir = os.path.dirname(video_path)
        if os.path.basename(video_dir).isdigit():  # Check if parent directory is a user ID folder
            output_path = os.path.join(video_dir, f'annotated_{os.path.basename(video_path)}')
        else:
            output_path = os.path.join(UPLOAD_FOLDER, f'annotated_{os.path.basename(video_path)}')
        
        logger.info(f"🎬 [ANNOTATED_VIDEO] Output path: {output_path}")
        
        # Try different codecs in order of preference
        codecs_to_try = [
            ('mp4v', 'MPEG-4'),
            ('XVID', 'XVID'),
            ('MJPG', 'Motion JPEG'),
        ]
        
        out = None
        fourcc = None
        codec_name = None
        
        for codec, name in codecs_to_try:
            try:
                fourcc = cv2.VideoWriter_fourcc(*codec)
                if fourcc != -1:
                    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
                    if out.isOpened():
                        codec_name = name
                        logger.info(f"🎬 [ANNOTATED_VIDEO] Successfully created video writer with codec: {name}")
                        break
                    else:
                        out.release()
                        logger.warning(f"🎬 [ANNOTATED_VIDEO] Codec {name} failed to open writer")
            except Exception as e:
                logger.warning(f"🎬 [ANNOTATED_VIDEO] Error trying codec {name}: {str(e)}")
                continue
        
        if not out or not out.isOpened():
            logger.error(f"🎬 [ANNOTATED_VIDEO] Failed to create video writer with any codec for: {output_path}")
            cap.release()
            return None
    
        frame_idx = 0
        frames_written = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Get keypoints for this frame
            if frame_idx < len(df):
                row = df.iloc[frame_idx]
                keypoints = []
                for name in keypoints_names:
                    x = row.get(f'{name}_x', 0)
                    y = row.get(f'{name}_y', 0)
                    conf = row.get(f'{name}_conf', 0)
                    # Normalize coordinates (they're already normalized from 0-1)
                    keypoints.append([y, x, conf])
                
                # Draw skeleton on frame
                frame = draw_pose_skeleton(frame, keypoints, keypoints_names)
            
            # Write frame
            write_success = out.write(frame)
            if write_success:
                frames_written += 1
            frame_idx += 1
        
        cap.release()
        out.release()
        
        logger.info(f"🎬 [ANNOTATED_VIDEO] Processed {frame_idx} frames, wrote {frames_written} frames")
        
        # Give the file system a moment to flush
        import time
        time.sleep(0.5)
        
        # Verify the file was created
        if not os.path.exists(output_path):
            logger.error(f"🎬 [ANNOTATED_VIDEO] File was not created: {output_path}")
            logger.error(f"🎬 [ANNOTATED_VIDEO] Directory exists: {os.path.exists(os.path.dirname(output_path))}")
            logger.error(f"🎬 [ANNOTATED_VIDEO] Directory is writable: {os.access(os.path.dirname(output_path), os.W_OK)}")
            return None
        
        file_size = os.path.getsize(output_path)
        logger.info(f"🎬 [ANNOTATED_VIDEO] Video saved successfully: {output_path} (size: {file_size} bytes)")
        
        if file_size == 0:
            logger.error(f"🎬 [ANNOTATED_VIDEO] File created but is empty (0 bytes)")
            os.remove(output_path)
            return None
        
        # Return just the filename for API access
        filename = os.path.basename(output_path)
        logger.info(f"🎬 [ANNOTATED_VIDEO] Returning filename: {filename}")
        return filename
        
    except Exception as e:
        logger.error(f"🎬 [ANNOTATED_VIDEO] Exception during video creation: {str(e)}", exc_info=True)
        if 'cap' in locals():
            cap.release()
        if 'out' in locals() and out:
            out.release()
        return None

def extract_pose_keypoints(video_path, player_type):
    cap = cv2.VideoCapture(video_path)
    all_keypoints, frame_idx = [], 0

    def detect_pose(frame):
        img = tf.image.resize_with_pad(tf.expand_dims(frame, axis=0), 256, 256)
        input_img = tf.cast(img, dtype=tf.int32)
        outputs = movenet_signature(input_img)
        return outputs['output_0'][0, 0, :, :].numpy()

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Calculate padding and scaling parameters that tf.image.resize_with_pad uses
    input_size = 256
    # Calculate scale and padding
    if width > height:
        scale = input_size / width
        pad_y = (input_size - (height * scale)) / 2
        pad_x = 0
    else:
        scale = input_size / height
        pad_y = 0
        pad_x = (input_size - (width * scale)) / 2

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        keypoints = detect_pose(img_rgb)

        row = {'frame': frame_idx}
        for idx, name in enumerate(keypoints_names):
            # Movenet returns normalized [0,1] coordinates relative to the 256x256 padded image
            y_norm_padded = keypoints[idx][0]
            x_norm_padded = keypoints[idx][1]
            conf = keypoints[idx][2]
            
            # Convert to pixel coordinates in the 256x256 padded image
            y_px_padded = y_norm_padded * input_size
            x_px_padded = x_norm_padded * input_size
            
            # Remove padding to get scaled pixel coordinates
            y_px_scaled = y_px_padded - pad_y
            x_px_scaled = x_px_padded - pad_x
            
            # Divide by scale to get original pixel coordinates
            y_px_original = y_px_scaled / scale
            x_px_original = x_px_scaled / scale
            
            # Normalize back to [0, 1] relative to original image dimensions for the CSV
            # This ensures draw_pose_skeleton works correctly (it multiplies by w and h)
            y_final_norm = y_px_original / height
            x_final_norm = x_px_original / width
            
            row[f'{name}_x'] = x_final_norm
            row[f'{name}_y'] = y_final_norm
            row[f'{name}_conf'] = conf
            
        all_keypoints.append(row)
        frame_idx += 1

    cap.release()
    df = pd.DataFrame(all_keypoints)
    
    # Determine where to save keypoints - use user folder if video is in user folder
    video_dir = os.path.dirname(video_path)
    if os.path.basename(video_dir).isdigit():  # Check if parent directory is a user ID folder
        keypoints_path = os.path.join(video_dir, f'{player_type}_keypoints.csv')
    else:
        keypoints_path = os.path.join(UPLOAD_FOLDER, f'{player_type}_keypoints.csv')
    
    df.to_csv(keypoints_path, index=False)
    
    # Create annotated video
    annotated_video_path = None
    logger.info(f"🎬 [EXTRACT_KEYPOINTS] About to create annotated video")
    logger.info(f"🎬 [EXTRACT_KEYPOINTS] Video path: {video_path}")
    logger.info(f"🎬 [EXTRACT_KEYPOINTS] Keypoints path: {keypoints_path}")
    logger.info(f"🎬 [EXTRACT_KEYPOINTS] Player type: {player_type}")
    
    try:
        annotated_video_path = create_annotated_video(video_path, keypoints_path, player_type)
        if annotated_video_path:
            logger.info(f"✅ [EXTRACT_KEYPOINTS] Annotated video created successfully: {annotated_video_path}")
        else:
            logger.warning(f"⚠️ [EXTRACT_KEYPOINTS] create_annotated_video returned None")
    except Exception as e:
        logger.error(f"❌ [EXTRACT_KEYPOINTS] Exception creating annotated video: {str(e)}", exc_info=True)
        annotated_video_path = None
    
    # Fallback: Check if annotated video file exists even if function returned None
    if not annotated_video_path:
        video_dir = os.path.dirname(video_path)
        if os.path.basename(video_dir).isdigit():
            expected_path = os.path.join(video_dir, f'annotated_{os.path.basename(video_path)}')
        else:
            expected_path = os.path.join(UPLOAD_FOLDER, f'annotated_{os.path.basename(video_path)}')
        
        if os.path.exists(expected_path):
            logger.info(f"Found annotated video file even though function returned None: {expected_path}")
            annotated_video_path = os.path.basename(expected_path)
            logger.info(f"Using fallback annotated video path: {annotated_video_path}")
        else:
            logger.warning(f"Annotated video file not found at expected path: {expected_path}")
    
    logger.info(f"Final annotated_video_path being returned: {annotated_video_path}")
    return keypoints_path, annotated_video_path

def calculate_angle(a, b, c):
    ba = np.array([a[0] - b[0], a[1] - b[1]])
    bc = np.array([c[0] - b[0], c[1] - b[1]])
    ba_norm = ba / np.linalg.norm(ba)
    bc_norm = bc / np.linalg.norm(bc)
    cos_angle = np.clip(np.dot(ba_norm, bc_norm), -1.0, 1.0)
    return np.degrees(np.arccos(cos_angle))

def compute_features(keypoints_path, side='right', player_type='batsman'):
    df = pd.read_csv(keypoints_path)
    shoulder = f'{side}_shoulder'
    elbow = f'{side}_elbow'
    wrist = f'{side}_wrist'
    ankle = f'{side}_ankle'
    opp_ankle = 'left_ankle' if side == 'right' else 'right_ankle'
    opp_shoulder = 'left_shoulder' if side == 'right' else 'right_shoulder'

    df['backlift_angle'] = df.apply(lambda row: calculate_angle(
        (row[f'{elbow}_x'], row[f'{elbow}_y']),
        (row[f'{shoulder}_x'], row[f'{shoulder}_y']),
        (row[f'{wrist}_x'], row[f'{wrist}_y'])), axis=1)

    df['stride_length'] = np.sqrt((df[f'{ankle}_x'] - df[f'{opp_ankle}_x'])**2 + (df[f'{ankle}_y'] - df[f'{opp_ankle}_y'])**2)
    df['height_estimate'] = np.sqrt((df[f'{shoulder}_x'] - df[f'{ankle}_x'])**2 + (df[f'{shoulder}_y'] - df[f'{ankle}_y'])**2)
    df['stride_length_ratio'] = df['stride_length'] / df['height_estimate']
    df['torso_rotation'] = np.abs(df[f'{shoulder}_x'] - df[f'{opp_shoulder}_x'])
    df['swing_path_variance'] = df[f'{wrist}_x'].rolling(window=5).var()

    summary = pd.DataFrame([
        ['mean_backlift_angle', df['backlift_angle'].mean()],
        ['max_backlift_angle', df['backlift_angle'].max()],
        ['min_backlift_angle', df['backlift_angle'].min()],
        ['mean_stride_length_ratio', df['stride_length_ratio'].mean()],
        ['max_stride_length_ratio', df['stride_length_ratio'].max()],
        ['min_stride_length_ratio', df['stride_length_ratio'].min()],
        ['mean_torso_rotation', df['torso_rotation'].mean()],
        ['max_torso_rotation', df['torso_rotation'].max()],
        ['min_torso_rotation', df['torso_rotation'].min()],
        ['mean_swing_path_variance', df['swing_path_variance'].mean()],
        ['max_swing_path_variance', df['swing_path_variance'].max()],
        ['min_swing_path_variance', df['swing_path_variance'].min()],
        ['max_head_lateral_displacement', df['nose_x'].max() - df['nose_x'].min()],
    ], columns=['metric', 'value'])

    summary_path = os.path.join(UPLOAD_FOLDER, f'{player_type}_summary_stats.csv')
    summary.to_csv(summary_path, index=False, float_format='%.17f')
    return summary_path

# def get_feedback_from_gpt(action_type, keypoint_csv_path, player_type):
#     # Read the full CSV file content
#     with open(keypoint_csv_path, 'r') as f:
#         keypoints_data = f.read()

#     # Also read the summary stats if available
#     summary_path = os.path.join(UPLOAD_FOLDER, f'{player_type}_summary_stats.csv')
#     summary_data = ""
#     if os.path.exists(summary_path):
#         with open(summary_path, 'r') as f:
#             summary_data = f.read()

#     if player_type == 'batting':
#             prompt = f"""
# You are a cricket batting coach AI and biomechanics expert in context of cricket.

# The predicted shot is: **{action_type}**

# Below is the batting_keypoints.csv data (pose landmarks):

# {keypoints_data}

# 1. Compute biomechanical features relevant to this shot.
# 2. Compare values against ideal coaching benchmarks.
# 3. Identify flaws with reasoning.
# 4. Recommend drills or corrections.

# Respond in JSON format like:

# ```json
# {{
#   "analysis": "...",
#   "flaws": [
#     {{
#       "feature": "backlift_angle",
#       "observed": 158.4,
#       "expected_range": "45-65",
#       "issue": "Too high for cover drive",
#       "recommendation": "Use mirror drill to restrict backlift"
#     }}
#   ],
#   "general_tips": ["Improve head stability", "Use shadow practice"]
# }}
# """
#     else:
#             prompt = f"""
# You are a cricket bowling coach AI and biomechanics expert in context of cricket.

# The predicted bowling action is: **{action_type}**

# Below is the bowling_keypoints.csv data (pose landmarks):

# {keypoints_data}

# 1. Compute biomechanical features relevant to this bowling action.
# 2. Compare values against ideal coaching benchmarks for {action_type}.
# 3. Identify flaws with reasoning.
# 4. Recommend drills or corrections.

# Respond in JSON format like:

# ```json
# {{
#   "analysis": "...",
#   "flaws": [
#     {{
#       "feature": "run_up_speed",
#       "observed": 8.5,
#       "expected_range": "10-12",
#       "issue": "Run-up too slow for fast bowling",
#       "recommendation": "Increase run-up speed gradually"
#     }}
#   ],
#   "general_tips": ["Improve follow-through", "Focus on wrist position"]
# }}
# """
    
#     response = client.chat.completions.create(
#         model="gpt-4o",
#         messages=[{"role": "user", "content": prompt}],
#         temperature=0.3
#     )

#     raw_content = response.choices[0].message.content
#     try:
#         json_text = re.search(r"\{.*\}", raw_content, re.DOTALL).group()
#         return json.loads(json_text)
#     except Exception as e:
#         print("Failed to parse GPT response:", e)
#         return {"error": "Failed to parse GPT response", "raw_content": raw_content}

def get_feedback_from_gpt(action_type, keypoint_csv_path, player_level='intermediate'):
    logger.info(f"Getting Gemini feedback for shot type: {action_type}, player level: {player_level}")
    
    # Read CSV and convert to JSON
    data = []
    try:
        with open(keypoint_csv_path, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                # Convert numeric fields to float
                processed_row = {}
                for k, v in row.items():
                    try:
                        # Try to convert to float if it's numeric
                        processed_row[k] = float(v)
                    except ValueError:
                        # Keep as string if not numeric
                        processed_row[k] = v
                data.append(processed_row)
    except Exception as e:
        logger.error(f"Failed to read CSV file: {e}", exc_info=True)
        return {"error": "Failed to read CSV file", "raw_content": str(e)}
    
    csv_json = json.dumps(data)

# ================================
# PROMPT A — BIOMECHANICAL ANALYST
# ================================

    prompt_A = f"""
    You are a **Cricket Biomechanics Analyst** specializing in batting mechanics.

    Your responsibility is STRICTLY LIMITED to:
    - analyzing pose keypoint time-series data
    - computing biomechanical features
    - comparing them against established cricket norms
    - reporting deviations and data confidence

    You are NOT a coach.
    You must NOT provide drills, cues, training advice, or subjective coaching opinions.

    ────────────────────────
    ANALYSIS PHILOSOPHY
    ────────────────────────
    - Be conservative, neutral, and data-driven
    - Prefer under-reporting over over-interpretation
    - If data quality is insufficient, explicitly state limitations
    - Use cricket-specific biomechanical norms only

    ────────────────────────
    CONTEXT
    ────────────────────────
    Shot Type: {action_type}

    Each row of the input represents one video frame containing
    body joint coordinates and bat reference points (if available).

    ────────────────────────
    INPUT DATA
    ────────────────────────
    {csv_json}

    ────────────────────────
    CRICKET NORM CONSTRAINT (CRITICAL)
    ────────────────────────
    All ideal ranges MUST be derived from:
    - ICC coaching manuals
    - Elite cricket academies
    - Peer-reviewed cricket biomechanics research

    - Do NOT invent arbitrary athletic ranges
    - Do NOT use single ideal values — ALWAYS use ranges

    ────────────────────────
    AUTO-FEATURE SELECTION LOGIC
    ────────────────────────
    1. Compute CORE features whenever required keypoints exist
    2. Compute CONDITIONAL features ONLY if motion clarity supports reliable temporal or velocity calculation
    3. Infer ADVANCED features conservatively and label them as estimated
    4. NEVER fabricate metrics requiring sensors not present (e.g., eye tracking, grip pressure, ball tracking)

    ────────────────────────
    FEATURE SELECTION GATING (STRICT)
    ────────────────────────
    - TIER 1: Include only if keypoints exist in ≥70% of frames
    - TIER 2: Include only if ≥80% frame continuity allows velocity or timing computation
    - TIER 3: Include only if supported by Tier 1 or Tier 2 signals

    Never promote or demote features across tiers.
    Never infer beyond available data.

    ────────────────────────
    FEATURE TIERS
    ────────────────────────
    TIER 1 — CORE
    - Head stability (lateral & vertical displacement)
    - Trunk lean
    - Spine angle change (setup → impact)
    - Shoulder rotation angle
    - Hip–shoulder separation
    - Front knee flexion at impact
    - Front-foot stride length
    - Backlift angle
    - Bat proximity to torso

    TIER 2 — CONDITIONAL
    - Hip rotation velocity
    - Bat angular velocity
    - Downswing duration
    - Center of mass shift
    - Peak bat speed timing

    Mark all Tier 2 features with "confidence": "medium"

    TIER 3 — INFERRED
    - Bat face stability
    - Wrist release timing
    - Sweet-spot contact probability
    - Kinetic chain sequencing quality

    Mark all Tier 3 features with "estimated": true

    ────────────────────────
    SHOT-SPECIFIC NORM ADJUSTMENT
    ────────────────────────
    Adjust interpretation based on shot type:
    - Defensive → compact mechanics, minimal displacement
    - Cover Drive → balance, front-knee stability, bat control
    - Cut Shot → late bat swing, controlled wrists
    - Pull / Hook → increased trunk rotation and bat arc
    - Lofted Shot → increased separation and bat speed

    A deviation exists ONLY if values clearly fall outside
    acceptable norms for the given shot type.

    ────────────────────────
    ANALYSIS TASKS
    ────────────────────────
    1. Select valid biomechanical features using tier rules
    2. Compute or estimate realistic numeric values
    3. Compare against cricket-norm ranges
    4. Classify deviations without coaching interpretation
    5. Report data quality and limitations

    ────────────────────────
    RULES (STRICT)
    ────────────────────────
    - Respond ONLY in valid JSON
    - No coaching language
    - No drills or recommendations
    - No null, NaN, or empty objects
    - Use realistic cricket biomechanics values only

    ────────────────────────
    REQUIRED JSON OUTPUT
    ────────────────────────
    {{
    "analysis_summary": "Neutral biomechanical assessment based on cricket norms",

    "data_quality": {{
        "frame_coverage": "percentage",
        "motion_clarity": "low | medium | high",
        "analysis_limitations": "explicit limitations based on data"
    }},

    "selected_features": {{
        "core": [],
        "conditional": [],
        "inferred": []
    }},

    "biomechanics": {{
        "core": {{}},
        "conditional": {{}},
        "inferred": {{}}
    }},

    "deviations": [
        {{
        "feature": "feature_name",
        "observed": 0.0,
        "ideal_range": "cricket-norm range",
        "deviation_type": "within_range | mild | significant",
        "biomechanical_note": "Mechanical difference only",
        "confidence": "high | medium"
        }}
    ]
    }}
    """


# ================================
# STAGE 1: BIOMECHANICAL ANALYSIS
# ================================
    logger.info("Stage 1: Running biomechanical analysis (Prompt A)...")
    try:
        response_A = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt_A]
        )

        raw_content_A = response_A.text
        try:
            json_text_A = re.search(r"\{.*\}", raw_content_A, re.DOTALL).group()
            biomechanics_report = json.loads(json_text_A)
            logger.info("Stage 1 completed: Biomechanical analysis received")
        except Exception as e:
            logger.error(f"Failed to parse Stage 1 (biomechanics) response: {e}", exc_info=True)
            return {
                "error": "Failed to parse biomechanics response", 
                "raw_content": raw_content_A,
                "stage": "biomechanics_analysis"
            }
    except Exception as e:
        logger.error(f"Failed to get Stage 1 (biomechanics) response: {e}", exc_info=True)
        return {
            "error": "Failed to get biomechanics response", 
            "raw_content": str(e),
            "stage": "biomechanics_analysis"
        }

# ================================
# STAGE 2: COACH INTERPRETATION
# ================================
    logger.info("Stage 2: Running coach interpretation (Prompt B)...")
    
    # Convert biomechanics report to JSON string for prompt_B
    biomechanics_report_json = json.dumps(biomechanics_report, indent=2)
    logger.info(f"Biomechanics report: {biomechanics_report_json}")
    
    prompt_B = f"""
You are an **elite Cricket Batting Coach** interpreting a biomechanics report.

Your role is to convert biomechanical deviations into
clear, practical, shot-specific coaching guidance.

You do NOT recompute biomechanics.
You rely ONLY on the provided analysis.

────────────────────────
COACHING PHILOSOPHY
────────────────────────
- Coach like an elite academy instructor
- Prioritize fundamentals over micro-details
- Ignore deviations that do not affect shot outcome
- Be concise, actionable, and player-appropriate

────────────────────────
INPUTS
────────────────────────
Shot Type: {action_type}
Player Level: {player_level}   # beginner | intermediate | advanced | elite

Biomechanics Report (JSON):
{biomechanics_report_json}

────────────────────────
INTERPRETATION RULES (STRICT)
────────────────────────
- Only "significant and mild" deviations may become confirmed faults
- "Mild" deviations may be monitored, not corrected
- Inferred features may NOT be the primary reason for a fault
- Limit confirmed faults to a maximum of 10
- CRITICAL: For each flaw, you MUST include both "observed" (numeric value) and "ideal_range" (string range) from the Biomechanics Report
- Data Mapping: Carry over the 'observed' and 'ideal_range' values EXACTLY as they appear in the Biomechanics Report for the chosen faults

────────────────────────
SKILL-LEVEL ADAPTATION
────────────────────────
- Beginner → simple language, balance & head position focus
- Intermediate → standard technical cues
- Advanced / Elite → sequencing and efficiency

────────────────────────
COACHING TASKS
────────────────────────
1. Review deviations and data quality
2. Decide which deviations are true technical faults
3. Rank faults by impact on the selected shot
4. Provide ONE drill per fault using standardized format
5. Address injury risks with appropriate caution level (if any biomechanical deviations suggest injury risk)
6. Reinforce strengths that should not be overcorrected

────────────────────────
DRILL FORMAT (MANDATORY)
────────────────────────
"Drill name — setup — execution cue — reps"

────────────────────────
RULES (STRICT)
────────────────────────
- Respond ONLY in valid JSON
- No biomechanics recalculation
- No contradiction of analysis confidence
- Use professional coaching language

────────────────────────
REQUIRED JSON OUTPUT
────────────────────────
{{
  "analysis_summary": "Comprehensive summary of the biomechanical analysis and coaching focus for this session. Include key findings, primary technical themes, and overall assessment for the {action_type} shot.",

  "flaws": [
    {{
      "feature": "feature_name",
      "observed": <numeric_value_from_biomechanics_report>,  # REQUIRED: Must be a number from the deviations array
      "ideal_range": "<string_range_from_biomechanics_report>",  # REQUIRED: Must be the exact ideal_range string from the deviations array
      "issue": "Shot-specific explanation of why this deviation matters",
      "recommendation": "Drill name — setup — execution cue — reps",
      "deviation": "Brief description of the deviation (optional, can be derived from observed vs ideal_range)"
    }}
  ],

  "injury_risk_assessment": [
    {{
      "body_part": "Lower back | Shoulder | Elbow | Wrist | Knee | Ankle",
      "risk_level": "Low | Moderate | High",
      "reason": "Biomechanical explanation of why this body part is at risk based on the batting technique"
    }}
  ],

  "general_tips": [
    "What to keep doing well",
    "What not to overcorrect",
    "Additional coaching tips and reminders"
  ]
}}
"""

    try:
        response_B = client.models.generate_content(
            model="gemini-2.5-pro",
            contents=[prompt_B]
        )

        raw_content_B = response_B.text
        try:
            json_text_B = re.search(r"\{.*\}", raw_content_B, re.DOTALL).group()
            coaching_feedback = json.loads(json_text_B)
            logger.info("Stage 2 completed: Coaching feedback received")
        except Exception as e:
            logger.error(f"Failed to parse Stage 2 (coaching) response: {e}", exc_info=True)
            # Return biomechanics report even if coaching fails
            return {
                "biomechanics_report": biomechanics_report,
                "coaching_feedback": {"error": "Failed to parse coaching response", "raw_content": raw_content_B},
                "stage": "coaching_interpretation"
            }
    except Exception as e:
        logger.error(f"Failed to get Stage 2 (coaching) response: {e}", exc_info=True)
        # Return biomechanics report even if coaching fails
        return {
            "biomechanics_report": biomechanics_report,
            "coaching_feedback": {"error": "Failed to get coaching response", "raw_content": str(e)},
            "stage": "coaching_interpretation"
        }

    # Enrich flaws with missing ideal_range and observed from biomechanics report
    flaws = coaching_feedback.get("flaws", [])
    deviations = biomechanics_report.get("deviations", [])
    
    # Create a lookup map from feature name to deviation data
    # deviation_map = {}

    deviation_map = {
    normalize_feature(dev.get("feature", "")): dev
    for dev in deviations
    }
    # for dev in deviations:
    #     feature_name = dev.get("feature", "")
    #     if feature_name:
    #         deviation_map[feature_name] = dev

    
    
    # ALWAYS overwrite ideal_range and observed from biomechanics report to ensure data consistency
    # Prompt B may not reliably carry these values forward, so we enforce them from Prompt A
    # for flaw in flaws:
    #     # feature_name = flaw.get("feature", "")
    #     feature_name = normalize_feature(flaw.get("feature", ""))
    #     if feature_name in deviation_map:
    #         dev = deviation_map[feature_name]
    #         # Always overwrite ideal_range from biomechanics report if it exists
    #         if dev.get("ideal_range"):
    #             flaw["ideal_range"] = dev.get("ideal_range")
    #             logger.info(f"Overwrote ideal_range for {feature_name} from biomechanics: {dev.get('ideal_range')}")
    #         elif "ideal_range" not in flaw or not flaw.get("ideal_range"):
    #             flaw["ideal_range"] = dev.get("ideal_range", "")
    #             logger.info(f"Filled missing ideal_range for {feature_name}: {dev.get('ideal_range', '')}")
    #         # Always overwrite observed from biomechanics report if it exists
    #         if dev.get("observed") is not None:
    #             flaw["observed"] = dev.get("observed")
    #             logger.info(f"Overwrote observed for {feature_name} from biomechanics: {dev.get('observed')}")
    #         elif "observed" not in flaw or flaw.get("observed") is None:
    #             flaw["observed"] = dev.get("observed")
    #             logger.info(f"Filled missing observed for {feature_name}: {dev.get('observed')}")

    for flaw in flaws:
        feature_name = normalize_feature(flaw.get("feature", ""))

        if feature_name not in deviation_map:
            continue

        dev = deviation_map[feature_name]

        # ✅ Only enforce biomechanics values if this is a real deviation
        if dev.get("deviation_type") in ("mild", "significant"):

            # Overwrite ideal_range ONLY for real deviations
            if dev.get("ideal_range"):
                flaw["ideal_range"] = dev["ideal_range"]
                logger.info(
                    f"Enforced ideal_range for {feature_name} from biomechanics: {dev['ideal_range']}"
                )

            # Overwrite observed ONLY for real deviations
            if dev.get("observed") is not None:
                flaw["observed"] = dev["observed"]
                logger.info(
                    f"Enforced observed for {feature_name} from biomechanics: {dev['observed']}"
                )


    # Simplified result - only fields that frontend actually uses
    analysis_text = coaching_feedback.get("analysis_summary",biomechanics_report.get("analysis_summary", ""))

    combined_result = {
        # Analysis summary - from Prompt B (coaching), fallback to Prompt A (biomechanics)
        # "analysis_summary": coaching_feedback.get("analysis_summary", biomechanics_report.get("analysis_summary", "")),
        # "analysis": coaching_feedback.get("analysis_summary", biomechanics_report.get("analysis_summary", "")),  # Backward compatibility

        "analysis_summary": analysis_text,
        "analysis": analysis_text,  # DEPRECATED: remove in v2

        # Flaws - from Prompt B (coaching feedback), enriched with biomechanics data
        # Each flaw includes: feature, observed (numeric), ideal_range (string), issue, recommendation, deviation
        "flaws": flaws,
        "technical_flaws": flaws,  # Backward compatibility alias
        
        # General tips - from Prompt B (coaching feedback)
        "general_tips": coaching_feedback.get("general_tips", []),
        
        # Injury risks - combine from both reports (coaching_feedback takes priority)
        "injury_risk_assessment": (
            coaching_feedback.get("injury_risk_assessment", [])
        ),
        "injury_risks": [
            f"{risk.get('body_part', 'Unknown')} - {risk.get('risk_level', 'Unknown')}: {risk.get('reason', '')}"
            for risk in (coaching_feedback.get("injury_risk_assessment", []))
        ],
        
        # Biomechanics data from Prompt A (for collapsible section in frontend)
        "biomechanics": biomechanics_report.get("biomechanics", {})
    }
    
    # Verify that flaws include observed and ideal_range
    for flaw in combined_result.get("flaws", []):
        if "observed" not in flaw or "ideal_range" not in flaw:
            logger.warning(f"Flaw missing observed or ideal_range: {flaw.get('feature', 'unknown')}")
    
    logger.info("Two-stage analysis completed successfully")
    logger.info("=" * 80)
    logger.info("COMBINED RESULT (BATTING) - BEFORE RETURNING:")
    logger.info("=" * 80)
    logger.info(f"Number of flaws: {len(combined_result.get('flaws', []))}")
    for i, flaw in enumerate(combined_result.get("flaws", [])):
        logger.info(f"Flaw {i+1}: {json.dumps(flaw, indent=2, default=str)}")
    logger.info("=" * 80)
    logger.info(f"Full combined result: {json.dumps(combined_result, indent=2, default=str)}")
    logger.info("=" * 80)
    return combined_result


def generate_training_plan(gpt_feedback, player_type, shot_type=None, bowler_type=None, days=7, report_path=None):
    """
    Generate a personalized multi-day training plan using the Gemini model.
    Returns a dict with structure: { "plan": [ {"day": 1, "focus": "...", "warmup":[...], "drills":[...], "notes":"..."}, ... ] }
    """
    # Read the report file if available - this is critical for generating shot-specific plans
    report_content = ""
    if report_path and os.path.exists(report_path):
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                report_content = f.read()
                logger.info(f"Successfully loaded report from {report_path}")
        except Exception as e:
            logger.error(f"Failed to read report file: {e}", exc_info=True)
    else:
        if report_path:
            logger.warning(f"Report path provided but file does not exist: {report_path}")
        else:
            logger.warning("No report path provided - training plan will be generated without detailed report context")
    
    # Create a comprehensive summary for Gemini
    # Simplified format: flat structure with all fields directly accessible
    if isinstance(gpt_feedback, dict):
        # Extract flaws - prioritize technical_flaws if available, otherwise use flaws
        all_flaws = gpt_feedback.get('technical_flaws', []) or gpt_feedback.get('flaws', [])
        
        summary = {
            "player_type": player_type,
            "shot_type": shot_type,
            "bowler_type": bowler_type,
            "flaws": all_flaws,
            "technical_flaws": gpt_feedback.get('technical_flaws', []),
            "analysis_summary": gpt_feedback.get('analysis_summary', ''),
            "general_tips": gpt_feedback.get('general_tips', []),
            "injury_risks": gpt_feedback.get('injury_risks', []),
            "injury_risk_assessment": gpt_feedback.get('injury_risk_assessment', [])
        }
    else:
        summary = {
            "player_type": player_type,
            "shot_type": shot_type,
            "bowler_type": bowler_type,
            "flaws": None,
            "general_tips": None,
            "injury_risks": None
        }

    # Build shot-specific context
    shot_context = ""
    if player_type == 'batsman' and shot_type:
        shot_context = f"\n\nCRITICAL: This training plan is specifically for improving the {shot_type.replace('_', ' ').title()} shot. All drills must target the technical flaws identified for this specific shot."
    elif player_type == 'bowler' and bowler_type:
        shot_context = f"\n\nCRITICAL: This training plan is specifically for improving {bowler_type.replace('_', ' ').title()} bowling technique. All drills must target the technical flaws identified for this bowling style."

    # Extract key flaws for emphasis
    flaws_summary = ""
    if summary.get('flaws') and len(summary['flaws']) > 0:
        flaws_list = []
        for flaw in summary['flaws'][:5]:  # Top 5 flaws
            if isinstance(flaw, dict):
                feature = flaw.get('feature', flaw.get('issue', 'Unknown'))
                issue = flaw.get('issue', flaw.get('recommendation', ''))
                flaws_list.append(f"- {feature}: {issue}")
        if flaws_list:
            flaws_summary = f"\n\nPRIMARY FLAWS TO ADDRESS:\n" + "\n".join(flaws_list)

    prompt = f"""
You are an expert cricket coach and training planner. Based on the comprehensive analysis and detailed report below, produce a {days}-day personalized training plan that specifically addresses the identified technical flaws.

PLAYER CONTEXT:
- Player Type: {player_type.title()}
- Shot/Bowling Type: {shot_type.replace('_', ' ').title() if shot_type else (bowler_type.replace('_', ' ').title() if bowler_type else 'Not specified')}
{shot_context}

ANALYSIS SUMMARY:
{json.dumps(summary, indent=2)}
{flaws_summary}

DETAILED REPORT (READ THIS CAREFULLY - IT CONTAINS THE COMPLETE ANALYSIS):
{report_content if report_content else "No detailed report available - use the analysis summary above."}

TRAINING PLAN REQUIREMENTS:
- Output must be valid JSON only.
- The top-level JSON must contain a key "plan" whose value is a list of days (1..{days}).
- Each day should include: "day" (int), "focus" (short string describing the main focus for that day), "warmup" (list of warmup steps), "drills" (list of drill objects with "name", "reps"/"sets"/"duration", and "notes"), "progression" (what to increase next session), and "notes" (short coaching notes).
- Add a short "overall_notes" field at the top level with recovery and weekly tips.
- Never return null values.
- Respond ONLY in valid JSON.
- Do not include explanations outside JSON.

CRITICAL INSTRUCTIONS:
1. The training plan MUST directly address the specific flaws identified in the analysis and report above.
2. Each day's drills should progressively work on correcting the identified technical issues.
3. For batsmen: Focus on improving the {shot_type.replace('_', ' ').title() if shot_type else 'specific shot'} technique based on the flaws found.
4. For bowlers: Focus on improving {bowler_type.replace('_', ' ').title() if bowler_type else 'bowling'} technique based on the flaws found.
5. Create drills that are realistic for a non-professional player to perform at a practice ground or at home.
6. Prioritize drills that address the most critical flaws first.
7. Include injury prevention exercises if injury risks were identified.

Example JSON structure:
{{
  "plan": [
    {{
      "day": 1,
      "focus": "Addressing [specific flaw from analysis]",
      "warmup": ["5 min jogging", "Dynamic stretches"],
      "drills": [
        {{
          "name": "Drill name targeting specific flaw",
          "reps": "3x10",
          "duration": "15 min",
          "notes": "Focus on correcting [specific issue]"
        }}
      ],
      "progression": "Increase reps to 3x12 next session",
      "notes": "Pay attention to [specific technique point]"
    }}
  ],
  "overall_notes": "Weekly recovery tips and general guidance"
}}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[prompt]
        )
        raw = response.text
        json_text = re.search(r"\{.*\}", raw, re.DOTALL).group()
        plan_json = json.loads(json_text)
        return plan_json
    except Exception as e:
        logger.exception("Failed to generate training plan from Gemini")
        # Fallback simple plan
        fallback = {
            "overall_notes": "Could not generate full plan automatically. Follow these simple drills.",
            "plan": []
        }
        for d in range(1, days+1):
            fallback['plan'].append({
                "day": d,
                "focus": "Technique & conditioning",
                "warmup": ["5 min jogging", "dynamic stretches 5 min"],
                "drills": [
                    {"name": "Mirror shadow practice", "reps": "10 min", "notes": "Focus on backlift and head stillness"},
                    {"name": "Single-leg balance", "reps": "3x30s each leg", "notes": "Improve landing stability"}
                ],
                "progression": "Increase 2 min drill time next session",
                "notes": "Keep sessions light and focus on technique"
            })
        return fallback


def generate_report(results, player_type, shot_type=None, batter_side=None, bowler_side=None, bowler_type=None, filename=None, user_id=None):
    """
    Generate a report file and save it to the user's folder.
    
    Args:
        results: Analysis results dictionary
        player_type: Type of player (batsman/bowler)
        shot_type: Type of shot (for batsman)
        batter_side: Side of batter
        bowler_side: Side of bowler
        bowler_type: Type of bowler
        filename: Original filename
        user_id: User ID to organize files in user folder
    
    Returns:
        Path to the generated report file
    """
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    if player_type == 'batsman':
        report_content = f"""
Cricket Batting Analysis Report
==============================

**Player Type:** {player_type}
**Shot Type:** {shot_type}
**Batter Side:** {batter_side}
**Filename:** {filename}
**Date:** {timestamp}

---

**Predicted Shot:** {shot_type}

---

**Biomechanical Analysis:**

```json
{json.dumps(results['gpt_feedback'], indent=4)}
```

---

**Technical Flaws:**

```json
{json.dumps(results['gpt_feedback'].get('flaws', []), indent=4)}
```

---

**General Tips:**

```json
{json.dumps(results['gpt_feedback'].get('general_tips', []), indent=4)}
```

---

**Conclusion:**

Based on the analysis, the batsman's technique for the {shot_type} shot could be improved in several areas. 
The biomechanical assessment reveals potential issues with backlift angle, stride length, and torso rotation.

**Recommendations:**

1. **Backlift Angle:** The batsman's backlift angle is crucial for power generation and shot execution.
2. **Stride Length:** The stride length affects balance and shot execution.
3. **Torso Rotation:** Proper torso rotation is essential for power and accuracy.
4. **Head Stability:** Maintaining head position throughout the shot is critical.
5. **Follow-Through:** A proper follow-through ensures complete shot execution.

**Drills to Improve:**

1. **Mirror Drill:** Practice the shot in front of a mirror to check technique.
2. **Shadow Practice:** Practice without a ball to focus on movement patterns.
3. **Stance Work:** Work on maintaining a stable stance throughout the shot.
4. **Timing Drills:** Practice timing with different ball speeds.
"""
    else:
        report_content = f"""
Cricket Bowling Analysis Report
===============================

**Player Type:** {player_type}
**Bowler Type:** {bowler_type.replace('_', ' ').title() if bowler_type else 'Not specified'}
**Bowler Side:** {bowler_side}
**Filename:** {filename}
**Date:** {timestamp}

---

**Biomechanical Analysis:**

```json
{json.dumps(results['gpt_feedback'], indent=4)}
```

---

**Technical Flaws:**

```json
{json.dumps(results['gpt_feedback'].get('flaws', []), indent=4)}
```

---

**Injury Risks:**

```json
{json.dumps(results['gpt_feedback'].get('injury_risks', []), indent=4)}
```

---

**General Tips:**

```json
{json.dumps(results['gpt_feedback'].get('general_tips', []), indent=4)}
```

---

**Conclusion:**

Based on the analysis, the {bowler_type.replace('_', ' ') if bowler_type else 'bowler'}'s technique could be improved in several areas. 
The biomechanical assessment reveals potential issues with run-up speed, delivery stride, and follow-through.

**Recommendations:**

1. **Run-Up Speed:** The bowler's run-up speed is crucial for {'pace generation' if bowler_type == 'fast_bowler' else 'rhythm and control'}.
2. **Delivery Stride:** The delivery stride affects accuracy and line-length consistency.
3. **Follow-Through:** A proper follow-through reduces injury risk and improves performance.
4. **Wrist Position:** Consistent wrist position is essential for accuracy.
5. **Core Strength:** Strong core muscles provide stability and power.

**Drills to Improve:**

1. **Mirror Drill:** Practice run-up and delivery in front of a mirror.
2. **Shadow Practice:** Practice delivery stride without a ball.
3. **Wrist Strength Drills:** Improve wrist position and power.
4. **Core Strength Drills:** Enhance overall stability and power.
"""
    
    # Generate unique report filename with timestamp (including microseconds for absolute uniqueness)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')  # %f is microseconds
    report_filename = f"report_{player_type}_{timestamp}.txt"
    
    # Save report to user's folder if user_id is provided
    if user_id:
        user_folder = get_user_upload_folder(user_id)
        report_path = os.path.join(user_folder, report_filename)
    else:
        # Fallback to main upload folder if user_id not provided
        report_path = os.path.join(UPLOAD_FOLDER, report_filename)
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    return report_path


@app.route('/')
def index():
    return jsonify({
        'message': 'CrickCoach API is running',
        'status': 'healthy',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'upload': '/api/upload',
            'auth': '/api/auth/login',
            'register': '/api/auth/register'
        }
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'video' not in request.files:
        return jsonify({'error': 'No video file selected'}), 400
    
    file = request.files['video']
    player_type = request.form.get('player_type', 'batsman')
    
    if file.filename == '':
        return jsonify({'error': 'No video file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        try:
            # model = get_shot_prediction_model()
            if player_type == 'batsman':
                # model = get_shot_prediction_model()  # Commented out - users will select shot type manually
                # shot_type = predict_shot(filepath, model)  # Commented out - users will select shot type manually
                shot_type = request.form.get('shot_type', '').strip()  # Get shot type from user input
                
                # Require shot_type to be provided by user
                if not shot_type:
                    return jsonify({'error': 'Shot type is required. Please select a shot type.'}), 400
                
                keypoints_path, annotated_video_path = extract_pose_keypoints(filepath, 'batting')
                batter_side = request.form.get('batter_side', 'right')
                gpt_feedback = get_feedback_from_gpt(shot_type, keypoints_path)
                results = {
                    'player_type': 'batsman',
                    'shot_type': shot_type,
                    'batter_side': batter_side,
                    'gpt_feedback': gpt_feedback,
                    'filename': filename,
                    'annotated_video_path': annotated_video_path if annotated_video_path else None
                }
            else:
                keypoints_path, annotated_video_path = extract_pose_keypoints(filepath, 'bowling')
                bowler_side = request.form.get('bowler_side', 'right')
                bowler_type = request.form.get('bowler_type', 'fast_bowler')
                gpt_feedback = get_feedback_from_gpt_for_bowling(keypoints_path, bowler_type)
                results = {
                    'player_type': 'bowler',
                    'bowler_side': bowler_side,
                    'bowler_type': bowler_type,
                    'gpt_feedback': gpt_feedback,
                    'filename': filename,
                    'annotated_video_path': annotated_video_path if annotated_video_path else None
                }
            report_path = generate_report(results, player_type, results.get('shot_type'), results.get('batter_side'), results.get('bowler_side'), results.get('bowler_type'), filename)
            results['report_path'] = report_path
            return render_template('results.html', results=results)
        except Exception as e:
            flash(f'Error processing video: {str(e)}')
            return redirect(url_for('index'))
    flash('Invalid file type. Please upload a video file.')
    return redirect(url_for('index'))

# Mobile API endpoints
@app.route('/api/upload', methods=['POST'])
@require_auth
def api_upload_file():
    logger.info(f"Received upload request from {request.remote_addr}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    logger.debug(f"Request files: {list(request.files.keys())}")
    logger.debug(f"Request form: {dict(request.form)}")
    logger.info(f"Shot type from form: {request.form.get('shot_type', 'NOT PROVIDED')}")
    
    # Get user info from authentication
    user_id = request.user['user_id']
    username = request.user['username']
    logger.info(f"Authenticated user: {username} (ID: {user_id})")
    
    if 'video' not in request.files:
        logger.warning("No video file in request")
        return jsonify({'error': 'No video file selected'}), 400
    
    file = request.files['video']
    player_type = request.form.get('player_type', 'batsman')
    bowler_type = request.form.get('bowler_type', 'fast_bowler')  # Default to fast bowler
    
    logger.info(f"File received: {file.filename}, Player type: {player_type}, Bowler type: {bowler_type}")
    
    if file.filename == '':
        logger.warning("Empty filename")
        return jsonify({'error': 'No video file selected'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        
        # Get user's upload folder and save file there
        user_folder = get_user_upload_folder(user_id)
        filepath = os.path.join(user_folder, filename)
        file.save(filepath)
        
        # Validate required form fields before enqueueing (so we can fail fast)
        if player_type == 'batsman':
            shot_type = request.form.get('shot_type', '').strip()
            if not shot_type:
                logger.warning("Shot type not provided by user")
                return jsonify({'error': 'Shot type is required. Please select a shot type.'}), 400
                
        expo_push_token = request.form.get('expo_push_token') or request.form.get('push_token')
        job_id = uuid.uuid4().hex
        now = datetime.utcnow().isoformat() + "Z"

        job = {
            "job_id": job_id,
            "status": "queued",
            "created_at": now,
            "updated_at": now,
            "user_id": user_id,
            "username": username,
            "filename": filename,
            "player_type": player_type,
        }
        save_job(user_id, job)

        worker = threading.Thread(
            target=process_analysis_job,
            args=(job_id, user_id, username, filepath, filename, dict(request.form), expo_push_token),
            daemon=True,
        )
        worker.start()

        logger.info(f"🧵 [JOB {job_id}] Enqueued analysis for {username} file {filename}")
        return jsonify({
            "success": True,
            "job_id": job_id,
            "filename": filename,
            "status": "queued",
        })
    
    logger.warning("Invalid file type")
    return jsonify({'error': 'Invalid file type. Please upload a video file.'}), 400

@app.route('/api/test-upload', methods=['POST'])
def test_upload():
    logger.info(f"Test upload request from {request.remote_addr}")
    
    if 'video' not in request.files:
        return jsonify({'error': 'No video file selected'}), 400
    
    file = request.files['video']
    if file.filename == '':
        return jsonify({'error': 'No video file selected'}), 400
    
    # Just save the file and return success without processing
    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, f"test_{filename}")
    file.save(filepath)
    
    return jsonify({
        'success': True,
        'message': 'File uploaded successfully (test mode)',
        'filename': filename,
        'size': os.path.getsize(filepath)
    })

@app.route('/api/results/<job_id>', methods=['GET'])
@require_auth
def get_job_results(job_id):
    """Get analysis job status/results by job_id (user-specific)"""
    try:
        user_id = request.user['user_id']
        username = request.user['username']
        logger.info(f"Getting job {job_id} by user: {username} (ID: {user_id})")

        job = load_job(user_id, job_id)
        if not job:
            return jsonify({'success': False, 'error': 'Job not found'}), 404

        if job.get('user_id') != user_id:
            return jsonify({'success': False, 'error': 'Access denied'}), 403

        status = job.get('status', 'queued')
        if status == 'completed' and job.get('result'):
            return jsonify({'success': True, 'status': 'completed', 'result': job.get('result')})
        if status == 'failed':
            return jsonify({'success': False, 'status': 'failed', 'error': job.get('error') or 'Analysis failed'})

        return jsonify({'success': True, 'status': status, 'filename': job.get('filename')})
    except Exception as e:
        logger.error(f"Error retrieving job results: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': f'Error retrieving results: {str(e)}'}), 500

@app.route('/api/results/by-filename/<filename>', methods=['GET'])
@require_auth
def get_analysis_results_by_filename(filename):
    """Get analysis results for a specific filename (user-specific, backward compatibility)"""
    try:
        user_id = request.user['user_id']
        username = request.user['username']
        logger.info(f"Getting results for {filename} by user: {username} (ID: {user_id})")

        user_folder = get_user_upload_folder(user_id)
        results_file = os.path.join(user_folder, f"results_{filename}.json")
        if os.path.exists(results_file):
            with open(results_file, 'r') as f:
                results = json.load(f)
            
            result_user_id = results.get('user_id')
            if result_user_id != user_id:
                return jsonify({'error': 'Access denied'}), 403
            
            return jsonify(results)
            return jsonify({'error': 'Results not found'}), 404
    except Exception as e:
        logger.error(f"Error retrieving results: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error retrieving results: {str(e)}'}), 500

@app.route('/api/reports', methods=['GET'])
def list_reports():
    """List all available reports"""
    try:
        reports = []
        for file in os.listdir(UPLOAD_FOLDER):
            if file.startswith('report_') and file.endswith('.txt'):
                file_path = os.path.join(UPLOAD_FOLDER, file)
                file_stats = os.stat(file_path)
                reports.append({
                    'filename': file,
                    'size': file_stats.st_size,
                    'created': datetime.fromtimestamp(file_stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
                    'modified': datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
                })
        
        # Sort by creation time (newest first)
        reports.sort(key=lambda x: x['created'], reverse=True)
        return jsonify({'reports': reports})
    except Exception as e:
        return jsonify({'error': f'Error listing reports: {str(e)}'}), 500

@app.route('/api/reports/<filename>', methods=['GET'])
def get_report(filename):
    """Get the content of a specific report"""
    try:
        report_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(report_path):
            with open(report_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({
                'filename': filename,
                'content': content,
                'size': os.path.getsize(report_path)
            })
        else:
            return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error reading report: {str(e)}'}), 500

@app.route('/api/download-report/<filename>', methods=['GET'])
def download_report(filename):
    """Download a specific report file"""
    try:
        report_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(report_path):
            from flask import send_file
            return send_file(report_path, as_attachment=True, download_name=filename)
        else:
            return jsonify({'error': 'Report not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Error downloading report: {str(e)}'}), 500

@app.route('/api/video/<path:filename>', methods=['GET'])
@require_auth
def serve_video(filename):
    """Serve video files (annotated or original)"""
    try:
        user_id = request.user['user_id']
        
        # Try user folder first
        user_folder = get_user_upload_folder(user_id)
        video_path = os.path.join(user_folder, filename)
        
        if not os.path.exists(video_path):
            # Try general upload folder
            video_path = os.path.join(UPLOAD_FOLDER, filename)
        
        if os.path.exists(video_path):
            from flask import send_file
            # Determine MIME type
            mime_type = 'video/mp4'
            if filename.lower().endswith('.mov'):
                mime_type = 'video/quicktime'
            elif filename.lower().endswith('.avi'):
                mime_type = 'video/x-msvideo'
            
            return send_file(video_path, mimetype=mime_type)
        else:
            return jsonify({'error': 'Video not found'}), 404
    except Exception as e:
        logger.error(f"Error serving video: {str(e)}", exc_info=True)
        return jsonify({'error': f'Error serving video: {str(e)}'}), 500

@app.route('/api/files', methods=['GET'])
def list_files():
    """List all files in the upload folder"""
    try:
        files = []
        for file in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, file)
            file_stats = os.stat(file_path)
            files.append({
                'filename': file,
                'size': file_stats.st_size,
                'type': 'video' if file.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')) else 
                       'report' if file.startswith('report_') else
                       'results' if file.startswith('results_') else
                       'data' if file.endswith('.csv') else 'other',
                'created': datetime.fromtimestamp(file_stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
                'modified': datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S')
            })
        
        # Sort by creation time (newest first)
        files.sort(key=lambda x: x['created'], reverse=True)
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': f'Error listing files: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def api_health():
    response = jsonify({'status': 'healthy', 'message': 'Cricket Coach API is running'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/api/history', methods=['GET'])
@require_auth
def get_analysis_history():
    """Get all analysis history with results for the authenticated user"""
    try:
        # Get user info from authentication
        user_id = request.user['user_id']
        username = request.user['username']
        print(f"Getting history for user: {username} (ID: {user_id})")
        
        # Get user's upload folder
        user_folder = get_user_upload_folder(user_id)
        
        history = []
        if os.path.exists(user_folder):
            for file in os.listdir(user_folder):
                if file.startswith('results_') and file.endswith('.json'):
                    file_path = os.path.join(user_folder, file)
                    file_stats = os.stat(file_path)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            result_data = json.load(f)
                        
                        # Only include results for the authenticated user
                        result_user_id = result_data.get('user_id')
                        if result_user_id != user_id:
                            continue
                        
                        # Extract filename from results_ prefix
                        original_filename = file.replace('results_', '').replace('.json', '')
                        
                        history_item = {
                            'id': file,
                            'filename': original_filename,
                            'player_type': result_data.get('player_type', 'unknown'),
                            'shot_type': result_data.get('shot_type'),
                            'bowler_type': result_data.get('bowler_type'),
                            'batter_side': result_data.get('batter_side'),
                            'bowler_side': result_data.get('bowler_side'),
                            'created': datetime.fromtimestamp(file_stats.st_ctime).strftime('%Y-%m-%d %H:%M:%S'),
                            'modified': datetime.fromtimestamp(file_stats.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                            'size': file_stats.st_size,
                            'success': result_data.get('success', True),
                            'has_gpt_feedback': 'gpt_feedback' in result_data and result_data['gpt_feedback'] is not None
                        }
                        history.append(history_item)
                    except Exception as e:
                        logging.warning(f"Failed to parse {file}: {e}")
                        continue
        
        # Sort by creation time (newest first)
        history.sort(key=lambda x: x['created'], reverse=True)
        print(f"Found {len(history)} analysis results for user {username}")
        return jsonify({'history': history})
    except Exception as e:
        logging.exception("Failed to get analysis history")
        return jsonify({'error': f'Error retrieving history: {str(e)}'}), 500

@app.route('/api/history/clear', methods=['DELETE'])
@require_auth
def clear_analysis_history():
    """Clear all analysis history for the authenticated user"""
    try:
        # Get user info from authentication
        user_id = request.user['user_id']
        username = request.user['username']
        print(f"Clearing history for user: {username} (ID: {user_id})")
        
        # Get user's upload folder
        user_folder = get_user_upload_folder(user_id)
        
        deleted_count = 0
        files_to_delete = []
        
        # Find all result files for this user in their folder
        if os.path.exists(user_folder):
            for file in os.listdir(user_folder):
                if file.startswith('results_') and file.endswith('.json'):
                    try:
                        file_path = os.path.join(user_folder, file)
                        files_to_delete.append(file_path)
                        
                        # Also try to delete associated files (reports, training plans, etc.)
                        filename = file.replace('results_', '').replace('.json', '')
                        # Delete report if exists
                        report_pattern = f"report_*{filename}*.txt"
                        report_files = glob.glob(os.path.join(user_folder, report_pattern))
                        files_to_delete.extend(report_files)
                        # Delete training plan if exists
                        plan_file = os.path.join(user_folder, f"training_plan_{filename}.json")
                        if os.path.exists(plan_file):
                            files_to_delete.append(plan_file)
                    except Exception as e:
                        logging.warning(f"Failed to parse {file}: {e}")
                        continue
        
        # Delete the files
        for file_path in files_to_delete:
            try:
                os.remove(file_path)
                deleted_count += 1
                print(f"Deleted: {file_path}")
            except Exception as e:
                logging.warning(f"Failed to delete {file_path}: {e}")
        
        print(f"Cleared {deleted_count} analysis results for user {username}")
        return jsonify({
            'message': f'Successfully cleared {deleted_count} analysis results',
            'deleted_count': deleted_count
        })
        
    except Exception as e:
        logging.exception("Failed to clear analysis history")
        return jsonify({'error': f'Error clearing history: {str(e)}'}), 500

@app.route('/api/training-plan', methods=['POST'])
@require_auth
def generate_training_plan_api():
    """Generate a personalized training plan based on analysis results (user-specific)"""
    try:
        # Get user info from authentication
        user_id = request.user['user_id']
        username = request.user['username']
        
        # Try to get JSON data first, fallback to form data
        try:
            data = request.get_json()
        except:
            # If JSON parsing fails, try form data
            data = {
                'filename': request.form.get('filename'),
                'days': request.form.get('days', 7)
            }
        
        # Extract parameters
        filename = data.get('filename')
        days = data.get('days', 7)
        
        print(f"Training plan generation requested for {filename} by user: {username} (ID: {user_id})")
        print(f"Training plan generation requested for {filename} ({days} days)")
        
        if not filename:
            return jsonify({'error': 'Filename is required'}), 400
        
        # Get user's upload folder
        user_folder = get_user_upload_folder(user_id)
        
        # Get the analysis results from user's folder
        results_file = os.path.join(user_folder, f"results_{filename}.json")
        if not os.path.exists(results_file):
            print(f"Analysis results not found for {filename} in user folder {user_folder}")
            return jsonify({'error': 'Analysis results not found'}), 404
        
        print(f"Found analysis results for {filename}")
        
        with open(results_file, 'r') as f:
            results = json.load(f)
        
        # Check if the results belong to the authenticated user
        result_user_id = results.get('user_id')
        if result_user_id != user_id:
            print(f"Access denied: User {username} tried to generate training plan for user ID {result_user_id}")
            return jsonify({'error': 'Access denied'}), 403
        
        # Extract data for training plan - use player_type from results (report_player_type)
        gpt_feedback = results.get('gpt_feedback', {})
        player_type = results.get('player_type', 'batsman')  # This is the report_player_type
        shot_type = results.get('shot_type')
        bowler_type = results.get('bowler_type')
        
        print(f"Generating training plan for {player_type} - Shot: {shot_type}, Bowler Type: {bowler_type}")
        
        # Find the latest report file for this user - this is critical for generating shot-specific training plans
        # Reports are uniquely named with timestamps: report_{player_type}_{timestamp}.txt
        report_path = None
        latest_mtime = 0
        
        # First, try the report_path from current results if it exists and belongs to user
        if results.get('report_path'):
            potential_path = results.get('report_path')
            if os.path.exists(potential_path):
                # Verify this report belongs to the current user by checking its modification time
                # and that it's linked to a results file with this user_id
                mtime = os.path.getmtime(potential_path)
                report_path = potential_path
                latest_mtime = mtime
                print(f"Found report from current results: {report_path}")
        
        # Find the latest report created by this user (across all their analyses)
        # This ensures we use the most recent report even if it's from a different analysis
        try:
            # Search through all results files in user's folder to find reports belonging to this user
            results_files = glob.glob(os.path.join(user_folder, 'results_*.json'))
            
            for results_file in results_files:
                try:
                    with open(results_file, 'r') as f:
                        other_results = json.load(f)
                    
                    # Check if this result belongs to the same user
                    other_user_id = other_results.get('user_id')
                    if other_user_id != user_id:
                        continue
                    
                    # Get the report path from this result
                    other_report_path = other_results.get('report_path')
                    if other_report_path and os.path.exists(other_report_path):
                        mtime = os.path.getmtime(other_report_path)
                        # Use this report if it's newer than what we have
                        if mtime > latest_mtime:
                            latest_mtime = mtime
                            report_path = other_report_path
                            print(f"Found newer report for user: {report_path} (modified: {datetime.fromtimestamp(mtime)})")
                except Exception as e:
                    logger.debug(f"Error reading results file {results_file}: {e}")
                    continue
            
            # If still no report found, try direct file search by pattern in user's folder
            if not report_path:
                # Get all report files for this player type in user's folder
                report_pattern = f"report_{player_type}_*.txt"
                report_files = glob.glob(os.path.join(user_folder, report_pattern))
                
                for report_file in report_files:
                    try:
                        mtime = os.path.getmtime(report_file)
                        # Verify this report belongs to the user by checking if it's linked in any results file
                        for results_file in results_files:
                            try:
                                with open(results_file, 'r') as f:
                                    check_results = json.load(f)
                                if (check_results.get('user_id') == user_id and 
                                    check_results.get('report_path') == report_file):
                                    if mtime > latest_mtime:
                                        latest_mtime = mtime
                                        report_path = report_file
                                        print(f"Found report by pattern matching: {report_path}")
                                    break
                            except:
                                continue
                    except Exception as e:
                        logger.debug(f"Error checking report file {report_file}: {e}")
                        continue
                        
        except Exception as e:
            logger.error(f"Error finding latest report for user: {e}", exc_info=True)
        
        if report_path and os.path.exists(report_path):
            print(f"Report will be used for training plan generation: {report_path}")
        else:
            print(f"WARNING: No report file found for {filename}. Training plan will be generated from analysis summary only.")
            print(f"This may result in a less specific training plan. Report should be available for best results.")
        
        # Generate training plan with the report - this ensures the plan addresses specific shot flaws
        print(f"Generating {days}-day training plan for {player_type} ({shot_type or bowler_type})...")
        training_plan = generate_training_plan(
            gpt_feedback=gpt_feedback,
            player_type=player_type,  # Using player_type from results (report_player_type)
            shot_type=shot_type,
            bowler_type=bowler_type,
            days=days,
            report_path=report_path  # Pass the report so flaws can be addressed
        )
        
        # Save training plan in user's folder
        plan_file = os.path.join(user_folder, f"training_plan_{filename}.json")
        with open(plan_file, 'w') as f:
            json.dump(training_plan, f, indent=2)
        
        print(f"Training plan successfully saved to: {plan_file}")
        
        return jsonify({
            'success': True,
            'training_plan': training_plan,
            'plan_file': f"training_plan_{filename}.json"
        })
        
    except Exception as e:
        logging.exception("Failed to generate training plan")
        print(f"Error generating training plan: {str(e)}")
        return jsonify({'error': f'Error generating training plan: {str(e)}'}), 500

@app.route('/api/training-plan/<filename>', methods=['GET'])
@require_auth
def get_training_plan(filename):
    """Get a specific training plan (user-specific)"""
    try:
        # Get user info from authentication
        user_id = request.user['user_id']
        username = request.user['username']
        print(f"Getting training plan for {filename} by user: {username} (ID: {user_id})")
        
        # Get user's upload folder
        user_folder = get_user_upload_folder(user_id)
        
        plan_file = os.path.join(user_folder, f"training_plan_{filename}.json")
        if os.path.exists(plan_file):
            print(f"Training plan found for {filename}")
            
            # Check if the corresponding analysis results belong to the authenticated user
            results_file = os.path.join(user_folder, f"results_{filename}.json")
            if os.path.exists(results_file):
                with open(results_file, 'r') as f:
                    results = json.load(f)
                
                result_user_id = results.get('user_id')
                if result_user_id != user_id:
                    print(f"Access denied: User {username} tried to access training plan for user ID {result_user_id}")
                    return jsonify({'error': 'Access denied'}), 403
            
            with open(plan_file, 'r') as f:
                plan = json.load(f)
            return jsonify(plan)
        else:
            print(f"No training plan exists for {filename} - this is normal for new analyses")
            return jsonify({'error': 'Training plan not found'}), 404
    except Exception as e:
        print(f"Error retrieving training plan for {filename}: {str(e)}")
        return jsonify({'error': f'Error retrieving training plan: {str(e)}'}), 500

# Authentication Endpoints
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        logger.info("=== REGISTRATION REQUEST RECEIVED ===")
        data = request.get_json()
        logger.debug(f"Request data: {data}")
        
        if not data:
            logger.warning("No data provided in registration request")
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        logger.info(f"Registration attempt - Username: {username}, Email: {email}")
        
        # Validation
        if not username or not email or not password:
            logger.warning("Missing required fields in registration request")
            return jsonify({'error': 'Username, email, and password are required'}), 400
        
        # Email format validation
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, email):
            logger.warning(f"Invalid email format in registration request: {email}")
            return jsonify({'error': 'Please enter a valid email address'}), 400
        
        if len(password) < 6:
            logger.warning("Password too short in registration request")
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Hash password
        logger.debug("Hashing password...")
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        logger.debug("Password hash created")
        
        # Save to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        try:
            logger.info("Inserting user into database...")
            cursor.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                (username, email, password_hash.decode('utf-8'))
            )
            conn.commit()
            logger.info("User inserted successfully")
            
            # Get user ID
            user_id = cursor.lastrowid
            logger.info(f"User ID: {user_id}")
            
            # Generate JWT token
            logger.debug("Generating JWT token...")
            token = generate_jwt_token(user_id, username)
            logger.info("Token generated successfully")
            
            conn.close()
            
            response_data = {
                'success': True,
                'message': 'User registered successfully',
                'token': token,
                'user': {
                    'id': user_id,
                    'username': username,
                    'email': email
                }
            }
            logger.info(f"Registration successful for user: {username}")
            response = jsonify(response_data)
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            return response
            
        except sqlite3.IntegrityError as e:
            conn.close()
            logger.warning(f"Integrity error during registration: {e}")
            return jsonify({'error': 'Username or email already exists'}), 409
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        logger.info("=== LOGIN REQUEST RECEIVED ===")
        data = request.get_json()
        logger.debug(f"Request data: {data}")
        
        if not data:
            logger.warning("No data provided in login request")
            return jsonify({'error': 'No data provided'}), 400
        
        username = data.get('username')
        password = data.get('password')
        logger.info(f"Login attempt for username: {username}")
        
        if not username or not password:
            logger.warning("Missing username or password in login request")
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        logger.debug("Querying database for user...")
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
        logger.debug(f"User found: {'Yes' if user else 'No'}")
        
        conn.close()
        
        if not user:
            logger.warning(f"User not found in database: {username}")
            return jsonify({'error': 'User not found. Please sign up first or check your username.'}), 401
        
        # Verify password
        logger.debug("Verifying password...")
        password_valid = bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8'))
        
        if not password_valid:
            logger.warning(f"Password verification failed for user: {username}")
            return jsonify({'error': 'Invalid username or password'}), 401
        
        # Generate JWT token
        logger.debug("Generating JWT token...")
        token = generate_jwt_token(user['id'], user['username'])
        logger.info(f"Login successful for user: {username} (ID: {user['id']})")
        
        response_data = {
            'success': True,
            'message': 'Login successful',
            'token': token,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email']
            }
        }
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/auth/verify', methods=['GET'])
@require_auth
def verify_token():
    """Verify JWT token and return user info"""
    try:
        return jsonify({
            'success': True,
            'user': {
                'id': request.user['user_id'],
                'username': request.user['username']
            }
        })
    except Exception as e:
        return jsonify({'error': 'Token verification failed'}), 500

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    """Logout user (client should discard token)"""
    return jsonify({
        'success': True,
        'message': 'Logout successful'
    })

@app.route('/api/auth/change-password', methods=['POST'])
@require_auth
def change_password():
    """Change user password"""
    try:
        logger.info("=== CHANGE PASSWORD REQUEST ===")
        data = request.get_json()
        logger.debug(f"Request data: {data}")
        
        if not data:
            logger.warning("No data provided in change password request")
            return jsonify({'error': 'No data provided'}), 400
        
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        user_id = request.user['user_id']
        username = request.user['username']
        
        logger.info(f"Change password attempt for user: {username} (ID: {user_id})")
        
        if not old_password or not new_password:
            logger.warning("Missing old_password or new_password in change password request")
            return jsonify({'error': 'Old password and new password are required'}), 400
        
        if len(new_password) < 6:
            logger.warning("New password too short in change password request")
            return jsonify({'error': 'New password must be at least 6 characters long'}), 400
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        logger.debug("Querying database for user...")
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            logger.warning(f"User not found in database: {user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        # Verify old password
        logger.debug("Verifying old password...")
        password_valid = bcrypt.checkpw(old_password.encode('utf-8'), user['password_hash'].encode('utf-8'))
        
        if not password_valid:
            conn.close()
            logger.warning(f"Old password verification failed for user: {username}")
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Hash new password
        logger.debug("Hashing new password...")
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update password in database
        logger.debug("Updating password in database...")
        cursor.execute('UPDATE users SET password_hash = ? WHERE id = ?', (new_password_hash.decode('utf-8'), user_id))
        conn.commit()
        conn.close()
        
        logger.info(f"Password changed successfully for user: {username}")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        })
        
    except Exception as e:
        logger.error(f"Change password error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to change password'}), 500

@app.route('/api/auth/delete-account', methods=['POST'])
@require_auth
def delete_account():
    """Delete user account and all associated data"""
    try:
        logger.info(f"=== DELETE ACCOUNT REQUEST ===")
        logger.info(f"User ID: {request.user['user_id']}")
        logger.info(f"Username: {request.user['username']}")
        
        # Get user data from request
        user_id = request.user['user_id']
        username = request.user['username']
        
        # Get user from database to verify
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            logger.warning(f"User not found in database for deletion: {user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        logger.info(f"Found user: {user['username']} ({user['email']})")
        
        # Delete user from database
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        conn.commit()
        
        # Check if user was actually deleted
        cursor.execute('SELECT COUNT(*) as count FROM users WHERE id = ?', (user_id,))
        remaining = cursor.fetchone()['count']
        
        conn.close()
        
        if remaining == 0:
            logger.info(f"User successfully deleted from database: {username} (ID: {user_id})")
            
            # Clean up user's analysis files (optional - you might want to keep them)
            cleanup_user_files(username)
            
            return jsonify({
                'success': True,
                'message': 'Account deleted successfully'
            })
        else:
            logger.error("Failed to delete user from database")
            return jsonify({'error': 'Failed to delete account'}), 500
            
    except Exception as e:
        logger.error(f"Delete account error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to delete account'}), 500

def cleanup_user_files(username):
    """Clean up files associated with the deleted user"""
    try:
        logger.info(f"Cleaning up files for user: {username}")
        
        # This is a basic cleanup - you might want to implement more sophisticated
        # file management based on your requirements
        
        # For now, we'll just log that cleanup was attempted
        # In a production system, you might want to:
        # - Delete user's uploaded videos
        # - Delete user's analysis results
        # - Delete user's training plans
        # - Archive data instead of deleting
        
        logger.info(f"File cleanup completed for user: {username}")
        
    except Exception as e:
        logger.error(f"Error during file cleanup: {str(e)}", exc_info=True)
        # Don't fail the account deletion if file cleanup fails

# OTP and Email Functions
def generate_otp(length=6):
    """Generate a random OTP"""
    return ''.join(random.choices(string.digits, k=length))

def send_email_via_smtp2go(to_email, subject, html_body, text_body=None):
    """Send email using SMTP2GO SMTP server"""
    try:
        if not SMTP_USER or not SMTP_PASSWORD:
            logger.error("SMTP credentials not configured")
            return False
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = to_email
        
        # Add text and HTML parts
        if text_body:
            text_part = MIMEText(text_body, 'plain')
            msg.attach(text_part)
        
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Connect to SMTP server
        logger.info(f"Connecting to SMTP server: {SMTP_HOST}:{SMTP_PORT}")
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()  # Enable encryption
        server.login(SMTP_USER, SMTP_PASSWORD)
        
        # Send email
        logger.info(f"Sending email to {to_email}")
        server.send_message(msg)
        server.quit()
        
        logger.info(f"Email sent successfully to {to_email}")
        return True
            
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending email: {str(e)}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Error sending email via SMTP2GO: {str(e)}", exc_info=True)
        return False

def send_otp_email(email, otp):
    """Send OTP email to user"""
    try:
        subject = "CrickCoach AI - Password Reset OTP"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .otp-box {{ background-color: #fff; border: 2px solid #4CAF50; padding: 20px; text-align: center; margin: 20px 0; }}
                .otp-code {{ font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>CrickCoach AI</h1>
                </div>
                <div class="content">
                    <h2>Password Reset Request</h2>
                    <p>You have requested to reset your password. Please use the following OTP code to verify your email address:</p>
                    <div class="otp-box">
                        <div class="otp-code">{otp}</div>
                    </div>
                    <p>This OTP will expire in {OTP_EXPIRATION_MINUTES} minutes.</p>
                    <p>If you did not request this password reset, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>© 2024 CrickCoach AI. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        CrickCoach AI - Password Reset OTP
        
        You have requested to reset your password. Please use the following OTP code to verify your email address:
        
        OTP Code: {otp}
        
        This OTP will expire in {OTP_EXPIRATION_MINUTES} minutes.
        
        If you did not request this password reset, please ignore this email.
        
        © 2024 CrickCoach AI. All rights reserved.
        """
        
        return send_email_via_smtp2go(email, subject, html_body, text_body)
        
    except Exception as e:
        logger.error(f"Error creating OTP email: {str(e)}", exc_info=True)
        return False

def store_otp(email, otp):
    """Store OTP with expiration time"""
    expires_at = datetime.utcnow() + timedelta(minutes=OTP_EXPIRATION_MINUTES)
    otp_storage[email.lower()] = {
        'otp': otp,
        'expires_at': expires_at,
        'verified': False
    }
    logger.info(f"OTP stored for {email}, expires at {expires_at}")

def verify_otp(email, otp):
    """Verify OTP for email"""
    email_lower = email.lower()
    
    if email_lower not in otp_storage:
        logger.warning(f"OTP not found for email: {email}")
        return False
    
    stored_data = otp_storage[email_lower]
    
    # Check if OTP has expired
    if datetime.utcnow() > stored_data['expires_at']:
        logger.warning(f"OTP expired for email: {email}")
        del otp_storage[email_lower]
        return False
    
    # Check if OTP matches
    if stored_data['otp'] != otp:
        logger.warning(f"Invalid OTP for email: {email}")
        return False
    
    # Mark as verified
    stored_data['verified'] = True
    logger.info(f"OTP verified for email: {email}")
    return True

def cleanup_expired_otps():
    """Remove expired OTPs from storage"""
    current_time = datetime.utcnow()
    expired_emails = [
        email for email, data in otp_storage.items()
        if current_time > data['expires_at']
    ]
    for email in expired_emails:
        del otp_storage[email]
        logger.debug(f"Removed expired OTP for {email}")

# Forgot Password Endpoints
@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Send OTP to user's email for password reset"""
    try:
        logger.info("=== FORGOT PASSWORD REQUEST ===")
        data = request.get_json()
        logger.debug(f"Request data: {data}")
        
        if not data:
            logger.warning("No data provided in forgot password request")
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        logger.info(f"Forgot password request for email: {email}")
        
        if not email:
            logger.warning("Email not provided in forgot password request")
            return jsonify({'error': 'Email is required'}), 400
        
        # Email format validation
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, email):
            logger.warning(f"Invalid email format in forgot password request: {email}")
            return jsonify({'error': 'Please enter a valid email address'}), 400
        
        # Check if user exists
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            # Don't reveal if email exists or not for security
            logger.info(f"Email not found in database: {email} (but not revealing to user)")
            # Still return success to prevent email enumeration
            return jsonify({
                'success': True,
                'message': 'If the email exists, an OTP has been sent'
            })
        
        # Clean up expired OTPs
        cleanup_expired_otps()
        
        # Generate OTP
        otp = generate_otp(OTP_LENGTH)
        logger.info(f"Generated OTP for {email}: {otp}")
        
        # Store OTP
        store_otp(email, otp)
        
        # Send OTP email
        email_sent = send_otp_email(email, otp)
        
        if not email_sent:
            logger.error(f"Failed to send OTP email to {email}")
            # Remove stored OTP if email failed
            if email in otp_storage:
                del otp_storage[email]
            return jsonify({'error': 'Failed to send OTP email. Please try again later.'}), 500
        
        logger.info(f"OTP sent successfully to {email}")
        
        return jsonify({
            'success': True,
            'message': 'OTP has been sent to your email address'
        })
        
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to process forgot password request'}), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP for password reset"""
    try:
        logger.info("=== VERIFY OTP REQUEST ===")
        data = request.get_json()
        logger.debug(f"Request data: {data}")
        
        if not data:
            logger.warning("No data provided in verify OTP request")
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        otp = data.get('otp', '').strip()
        
        logger.info(f"OTP verification request for email: {email}")
        
        if not email or not otp:
            logger.warning("Email or OTP not provided in verify OTP request")
            return jsonify({'error': 'Email and OTP are required'}), 400
        
        # Clean up expired OTPs
        cleanup_expired_otps()
        
        # Verify OTP
        if verify_otp(email, otp):
            logger.info(f"OTP verified successfully for email: {email}")
            return jsonify({
                'success': True,
                'message': 'OTP verified successfully'
            })
        else:
            logger.warning(f"OTP verification failed for email: {email}")
            return jsonify({'error': 'Invalid or expired OTP'}), 400
        
    except Exception as e:
        logger.error(f"Verify OTP error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to verify OTP'}), 500

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using verified OTP"""
    try:
        logger.info("=== RESET PASSWORD REQUEST ===")
        data = request.get_json()
        logger.debug(f"Request data: {data}")
        
        if not data:
            logger.warning("No data provided in reset password request")
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip().lower()
        new_password = data.get('new_password', '').strip()
        
        logger.info(f"Password reset request for email: {email}")
        
        if not email or not new_password:
            logger.warning("Email or new_password not provided in reset password request")
            return jsonify({'error': 'Email and new password are required'}), 400
        
        if len(new_password) < 6:
            logger.warning("New password too short in reset password request")
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Check if OTP was verified
        email_lower = email.lower()
        if email_lower not in otp_storage:
            logger.warning(f"No OTP found for email: {email}")
            return jsonify({'error': 'OTP not found or expired. Please request a new OTP.'}), 400
        
        stored_data = otp_storage[email_lower]
        
        # Check if OTP has expired
        if datetime.utcnow() > stored_data['expires_at']:
            logger.warning(f"OTP expired for email: {email}")
            del otp_storage[email_lower]
            return jsonify({'error': 'OTP has expired. Please request a new OTP.'}), 400
        
        # Check if OTP was verified
        if not stored_data['verified']:
            logger.warning(f"OTP not verified for email: {email}")
            return jsonify({'error': 'OTP not verified. Please verify OTP first.'}), 400
        
        # Get user from database
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            logger.warning(f"User not found in database: {email}")
            return jsonify({'error': 'User not found'}), 404
        
        # Hash new password
        logger.debug("Hashing new password...")
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update password in database
        logger.debug("Updating password in database...")
        cursor.execute('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?', 
                      (new_password_hash.decode('utf-8'), email))
        conn.commit()
        conn.close()
        
        # Remove OTP from storage after successful password reset
        del otp_storage[email_lower]
        
        logger.info(f"Password reset successfully for email: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Password reset successfully'
        })
        
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to reset password'}), 500

if __name__ == '__main__':
    # Initialize database
    logger.info("Initializing database...")
    init_database()
    
    # Initialize models before starting the server
    initialize_models()
    
    # Start the Flask server
    port = int(os.environ.get('FLASK_PORT', 3000))
    logger.info(f"Starting Flask server on port {port}")
    logger.info("=" * 80)
    
    # Server environment - disable debug mode and reloader
    app.run(debug=False, host='0.0.0.0', port=port, use_reloader=False)
    