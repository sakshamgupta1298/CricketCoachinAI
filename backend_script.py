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
shot_prediction_model = None
pose_detection_model = None
movenet_signature = None
keypoints_names = ["nose", "left_eye", "right_eye", "left_ear", "right_ear", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]


# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv'}

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
    global shot_prediction_model, pose_detection_model, movenet_signature
    logger.info("Initializing models...")
    shot_prediction_model = load_model()
    logger.info("Shot prediction model loaded successfully")
    pose_detection_model = hub.load("https://tfhub.dev/google/movenet/singlepose/thunder/4")
    movenet_signature = pose_detection_model.signatures['serving_default']
    logger.info("Pose detection model loaded successfully")
    logger.info("All models initialized successfully!")

def get_shot_prediction_model():
    global shot_prediction_model
    if shot_prediction_model is None:
        logger.warning("Shot prediction model not initialized, loading now...")
        shot_prediction_model = load_model()
        logger.info("Shot prediction model loaded")
    return shot_prediction_model

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

def predict_shot(video_path, model):
    logger.info(f"Starting shot prediction for video: {video_path}")
    logger.debug(f"Model type: {type(model)}")
    logger.debug(f"Model in eval mode: {not model.training}")
    
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    logger.info(f"Total frames in video: {total_frames}")
    
    # Check if video has frames
    if total_frames <= 0:
        logger.error(f"Video file has no frames or is corrupted: {video_path}")
        cap.release()
        return 'coverdrive'  # Default fallback
    
    indices = sorted(torch.randperm(total_frames)[:32].tolist()) if total_frames >= 32 else list(range(total_frames)) + [total_frames - 1] * (32 - total_frames)
    logger.debug(f"Selected frame indices: {indices[:5]}... (showing first 5)")

    frames, current_idx, idx_set = [], 0, set(indices)
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if current_idx in idx_set:
            try:
                frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame = transform(frame)
                frames.append(frame)
                if len(frames) == len(indices):
                    break
            except Exception as e:
                logger.warning(f"Error processing frame {current_idx}: {e}")
        current_idx += 1
    cap.release()
    
    logger.info(f"Successfully extracted {len(frames)} frames")

    # Check if we extracted any frames
    if not frames:
        logger.error(f"No frames extracted from video: {video_path}")
        return 'coverdrive'  # Default fallback
    
    # Check if we have enough frames
    if len(frames) < 1:
        logger.error(f"Insufficient frames extracted: {len(frames)}")
        return 'coverdrive'  # Default fallback

    try:
        logger.debug(f"Processing {len(frames)} frames for prediction")
        frames = torch.stack(frames).permute(1, 0, 2, 3)
        fast_pathway = frames
        slow_pathway = frames[:, ::4, :, :]
        inputs = [slow_pathway.unsqueeze(0), fast_pathway.unsqueeze(0)]
        
        logger.debug(f"Input shapes - Fast: {fast_pathway.shape}, Slow: {slow_pathway.shape}")

        with torch.no_grad():
            outputs = model([inp for inp in inputs])
            logger.debug(f"Model outputs: {outputs}")
            logger.debug(f"Model output shape: {outputs.shape}")
            logger.debug(f"Raw output values: {outputs.tolist()}")
            
            # Get probabilities using softmax
            probs = torch.softmax(outputs, dim=1)
            logger.info(f"Prediction probabilities - Coverdrive: {probs[0][0].item():.4f}, Pull Shot: {probs[0][1].item():.4f}")
            
            _, pred = torch.max(outputs, 1)
            pred_value = pred.item()
            logger.info(f"Predicted class index: {pred_value}")
            
            shot_type = ['coverdrive', 'pull_shot'][pred_value]
            logger.info(f"Final prediction: {shot_type}")
            return shot_type
    except Exception as e:
        logger.error(f"Error in shot prediction: {str(e)}", exc_info=True)
        logger.error(f"Exception type: {type(e).__name__}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        return 'coverdrive'  # Default fallback

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
    deviation_map = {}
    for dev in deviations:
        feature_name = dev.get("feature", "")
        if feature_name:
            deviation_map[feature_name] = dev
    
    # Fill in missing ideal_range and observed from biomechanics report
    for flaw in flaws:
        feature_name = flaw.get("feature", "")
        if feature_name in deviation_map:
            dev = deviation_map[feature_name]
            if "ideal_range" not in flaw or not flaw.get("ideal_range"):
                flaw["ideal_range"] = dev.get("ideal_range", "")
                logger.info(f"Filled missing ideal_range for {feature_name}: {dev.get('ideal_range', '')}")
            if "observed" not in flaw or flaw.get("observed") is None:
                flaw["observed"] = dev.get("observed")
                logger.info(f"Filled missing observed for {feature_name}: {dev.get('observed')}")

    # Simplified result - only fields that frontend actually uses
    combined_result = {
        # Analysis summary - from Prompt B (coaching), fallback to Prompt A (biomechanics)
        "analysis_summary": coaching_feedback.get("analysis_summary", biomechanics_report.get("analysis_summary", "")),
        "analysis": coaching_feedback.get("analysis_summary", biomechanics_report.get("analysis_summary", "")),  # Backward compatibility
        
        # Flaws - from Prompt B (coaching feedback), enriched with biomechanics data
        # Each flaw includes: feature, observed (numeric), ideal_range (string), issue, recommendation, deviation
        "flaws": flaws,
        "technical_flaws": flaws,  # Backward compatibility alias
        
        # General tips - from Prompt B (coaching feedback)
        "general_tips": coaching_feedback.get("general_tips", []),
        
        # Injury risks - combine from both reports (coaching_feedback takes priority)
        "injury_risk_assessment": (
            coaching_feedback.get("injury_risk_assessment", []) + 
            biomechanics_report.get("injury_risk_assessment", [])
        ),
        "injury_risks": [
            f"{risk.get('body_part', 'Unknown')} - {risk.get('risk_level', 'Unknown')}: {risk.get('reason', '')}"
            for risk in (coaching_feedback.get("injury_risk_assessment", []) + 
                        biomechanics_report.get("injury_risk_assessment", []))
        ],
        
        # Biomechanics data from Prompt A (for collapsible section in frontend)
        "biomechanics": biomechanics_report.get("biomechanics", {})
    }
    
    # Verify that flaws include observed and ideal_range
    for flaw in combined_result.get("flaws", []):
        if "observed" not in flaw or "ideal_range" not in flaw:
            logger.warning(f"Flaw missing observed or ideal_range: {flaw.get('feature', 'unknown')}")
    
    logger.info("Two-stage bowling analysis completed successfully")
    logger.info(f"Combined result: {combined_result}")
    return combined_result


def extract_pose_keypoints(video_path, player_type):
    cap = cv2.VideoCapture(video_path)
    all_keypoints, frame_idx = [], 0

    def detect_pose(frame):
        img = tf.image.resize_with_pad(tf.expand_dims(frame, axis=0), 256, 256)
        input_img = tf.cast(img, dtype=tf.int32)
        outputs = movenet_signature(input_img)
        return outputs['output_0'][0, 0, :, :].numpy()

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        keypoints = detect_pose(img_rgb)

        row = {'frame': frame_idx}
        for idx, name in enumerate(keypoints_names):
            row[f'{name}_x'] = keypoints[idx][1]
            row[f'{name}_y'] = keypoints[idx][0]
            row[f'{name}_conf'] = keypoints[idx][2]
        all_keypoints.append(row)
        frame_idx += 1

    cap.release()
    df = pd.DataFrame(all_keypoints)
    keypoints_path = os.path.join(UPLOAD_FOLDER, f'{player_type}_keypoints.csv')
    df.to_csv(keypoints_path, index=False)
    return keypoints_path

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
    deviation_map = {}
    for dev in deviations:
        feature_name = dev.get("feature", "")
        if feature_name:
            deviation_map[feature_name] = dev
    
    # Fill in missing ideal_range and observed from biomechanics report
    for flaw in flaws:
        feature_name = flaw.get("feature", "")
        if feature_name in deviation_map:
            dev = deviation_map[feature_name]
            if "ideal_range" not in flaw or not flaw.get("ideal_range"):
                flaw["ideal_range"] = dev.get("ideal_range", "")
                logger.info(f"Filled missing ideal_range for {feature_name}: {dev.get('ideal_range', '')}")
            if "observed" not in flaw or flaw.get("observed") is None:
                flaw["observed"] = dev.get("observed")
                logger.info(f"Filled missing observed for {feature_name}: {dev.get('observed')}")

    # Simplified result - only fields that frontend actually uses
    combined_result = {
        # Analysis summary - from Prompt B (coaching), fallback to Prompt A (biomechanics)
        "analysis_summary": coaching_feedback.get("analysis_summary", biomechanics_report.get("analysis_summary", "")),
        "analysis": coaching_feedback.get("analysis_summary", biomechanics_report.get("analysis_summary", "")),  # Backward compatibility
        
        # Flaws - from Prompt B (coaching feedback), enriched with biomechanics data
        # Each flaw includes: feature, observed (numeric), ideal_range (string), issue, recommendation, deviation
        "flaws": flaws,
        "technical_flaws": flaws,  # Backward compatibility alias
        
        # General tips - from Prompt B (coaching feedback)
        "general_tips": coaching_feedback.get("general_tips", []),
        
        # Injury risks - combine from both reports (coaching_feedback takes priority)
        "injury_risk_assessment": (
            coaching_feedback.get("injury_risk_assessment", []) + 
            biomechanics_report.get("injury_risk_assessment", [])
        ),
        "injury_risks": [
            f"{risk.get('body_part', 'Unknown')} - {risk.get('risk_level', 'Unknown')}: {risk.get('reason', '')}"
            for risk in (coaching_feedback.get("injury_risk_assessment", []) + 
                        biomechanics_report.get("injury_risk_assessment", []))
        ],
        
        # Biomechanics data from Prompt A (for collapsible section in frontend)
        "biomechanics": biomechanics_report.get("biomechanics", {})
    }
    
    # Verify that flaws include observed and ideal_range
    for flaw in combined_result.get("flaws", []):
        if "observed" not in flaw or "ideal_range" not in flaw:
            logger.warning(f"Flaw missing observed or ideal_range: {flaw.get('feature', 'unknown')}")
    
    logger.info("Two-stage analysis completed successfully")
    return combined_result


def generate_training_plan(gpt_feedback, player_type='batsman', shot_type=None, bowler_type=None, days=7, report_path=None):
    """
    Generate a personalized multi-day training plan using the Gemini model.
    Returns a dict with structure: { "plan": [ {"day": 1, "focus": "...", "warmup":[...], "drills":[...], "notes":"..."}, ... ] }
    """
    # Read the report file if available
    report_content = ""
    if report_path and os.path.exists(report_path):
        try:
            with open(report_path, 'r', encoding='utf-8') as f:
                report_content = f.read()
        except Exception as e:
            logger.error(f"Failed to read report file: {e}", exc_info=True)
    
    # Create a comprehensive summary for Gemini
    # Simplified format: flat structure with all fields directly accessible
    if isinstance(gpt_feedback, dict):
        summary = {
            "player_type": player_type,
            "shot_type": shot_type,
            "bowler_type": bowler_type,
            "flaws": gpt_feedback.get('flaws', []),
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

    prompt = f"""
You are an expert cricket coach and training planner. Based on the comprehensive analysis below, produce a {days}-day personalized training plan.

ANALYSIS SUMMARY:
{json.dumps(summary, indent=2)}

DETAILED REPORT:
{report_content}

Requirements:
- Output must be valid JSON only.
- The top-level JSON must contain a key "plan" whose value is a list of days (1..{days}).
- Each day should include: "day" (int), "focus" (short string), "warmup" (list of steps), "drills" (list of drills with reps/sets/duration), "progression" (what to increase next session), and "notes" (short coaching notes).
- Add a short "overall_notes" field at the top level with recovery and weekly tips.
- Never return null values.
- Respond ONLY in valid JSON.
- Do not include explanations outside JSON.

Example:
{{ "plan": [{{"day":1,"focus":"...","warmup":[...],"drills":[...],"progression":"...","notes":"..."}}, ...], "overall_notes": "..." }}

Create drills that are realistic for a non-professional player to perform at a practice ground or at home.
Focus on addressing the specific flaws and biomechanical issues identified in the analysis.
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


def generate_report(results, player_type, shot_type=None, batter_side=None, bowler_side=None, bowler_type=None, filename=None):
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
    
    report_filename = f"report_{player_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
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
                model = get_shot_prediction_model()
                shot_type = predict_shot(filepath, model)
                keypoints_path = extract_pose_keypoints(filepath, 'batting')
                batter_side = request.form.get('batter_side', 'right')
                gpt_feedback = get_feedback_from_gpt(shot_type, keypoints_path)
                results = {
                    'player_type': 'batsman',
                    'shot_type': shot_type,
                    'batter_side': batter_side,
                    'gpt_feedback': gpt_feedback,
                    'filename': filename
                }
            else:
                keypoints_path = extract_pose_keypoints(filepath, 'bowling')
                bowler_side = request.form.get('bowler_side', 'right')
                bowler_type = request.form.get('bowler_type', 'fast_bowler')
                gpt_feedback = get_feedback_from_gpt_for_bowling(keypoints_path, bowler_type)
                results = {
                    'player_type': 'bowler',
                    'bowler_side': bowler_side,
                    'bowler_type': bowler_type,
                    'gpt_feedback': gpt_feedback,
                    'filename': filename
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
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        logger.info(f"File saved to {filepath}, starting processing...")
        
        try:
            if player_type == 'batsman':
                # Batting analysis
                logger.info("Starting batting analysis...")
                
                # Check if shot_type is provided by user (skip auto-detection if provided)
                shot_type = request.form.get('shot_type', '').strip()
                
                if shot_type:
                    # User provided shot_type, skip auto-detection
                    logger.info(f"Using user-provided shot type: {shot_type}")
                else:
                    # Auto-detect shot type using ML model
                    logger.info("Shot type not provided, starting auto-detection...")
                    logger.info("Getting shot prediction model...")
                    model = get_shot_prediction_model()
                    logger.info("Model ready for prediction")
                    logger.info("Predicting shot type...")
                    try:
                        shot_type = predict_shot(filepath, model)
                        logger.info(f"Shot type predicted: {shot_type}")
                    except Exception as e:
                        logger.error(f"Error in shot prediction: {str(e)}", exc_info=True)
                        shot_type = 'coverdrive'  # Default fallback
                
                logger.info("Extracting pose keypoints...")
                try:
                    keypoints_path = extract_pose_keypoints(filepath, 'batting')
                    logger.info("Keypoints extracted successfully")
                except Exception as e:
                    logger.error(f"Error in keypoint extraction: {str(e)}", exc_info=True)
                    return jsonify({'error': f'Error extracting pose keypoints: {str(e)}'}), 500
                
                batter_side = request.form.get('batter_side', 'right')
                logger.info("Computing features...")
                try:
                    summary_path = compute_features(keypoints_path, batter_side, 'batting')
                    logger.info("Features computed successfully")
                except Exception as e:
                    logger.error(f"Error in feature computation: {str(e)}", exc_info=True)
                    return jsonify({'error': f'Error computing features: {str(e)}'}), 500
                
                logger.info("Getting Gemini feedback...")
                try:
                    gpt_feedback = get_feedback_from_gpt(shot_type, keypoints_path)
                    logger.info("Gemini feedback received successfully")
                except Exception as e:
                    logger.error(f"Error in Gemini feedback: {str(e)}", exc_info=True)
                    gpt_feedback = "Unable to generate feedback at this time."
                
                results = {
                    'success': True,
                    'user_id': user_id,
                    'username': username,
                    'player_type': 'batsman',
                    'shot_type': shot_type,
                    'batter_side': batter_side,
                    'gpt_feedback': gpt_feedback,
                    'filename': filename
                }
                
                # Generate and save report
                logger.info("Generating report...")
                try:
                    report_path = generate_report(results, 'batsman', shot_type, batter_side, None, None, filename)
                    results['report_path'] = report_path
                    logger.info(f"Report saved to: {report_path}")
                except Exception as e:
                    logger.error(f"Error generating report: {str(e)}", exc_info=True)
                    results['report_path'] = None
                
                # Save results as JSON for later retrieval
                results_file = os.path.join(UPLOAD_FOLDER, f"results_{filename}.json")
                with open(results_file, 'w') as f:
                    json.dump(results, f, indent=2)
                logger.info(f"Results saved to: {results_file}")
                
            else:
                # Bowling analysis
                logger.info("Starting bowling analysis...")
                logger.info("Extracting pose keypoints for bowling...")
                try:
                    keypoints_path = extract_pose_keypoints(filepath, 'bowling')
                    logger.info("Keypoints extracted successfully")
                except Exception as e:
                    logger.error(f"Error in keypoint extraction: {str(e)}", exc_info=True)
                    return jsonify({'error': f'Error extracting pose keypoints: {str(e)}'}), 500
                
                bowler_side = request.form.get('bowler_side', 'right')
                bowler_type = request.form.get('bowler_type', 'fast_bowler') # Default to fast bowler
                logger.info("Computing bowling features...")
                try:
                    summary_path = compute_features(keypoints_path, bowler_side, 'bowling')
                    logger.info("Features computed successfully")
                except Exception as e:
                    logger.error(f"Error in feature computation: {str(e)}", exc_info=True)
                    return jsonify({'error': f'Error computing features: {str(e)}'}), 500
                
                logger.info("Getting Gemini feedback for bowling...")
                try:
                    gpt_feedback = get_feedback_from_gpt_for_bowling(keypoints_path, bowler_type)
                    logger.info("Gemini feedback received successfully")
                except Exception as e:
                    logger.error(f"Error in Gemini feedback: {str(e)}", exc_info=True)
                    gpt_feedback = "Unable to generate feedback at this time."
                
                results = {
                    'success': True,
                    'user_id': user_id,
                    'username': username,
                    'player_type': 'bowler',
                    'bowler_side': bowler_side,
                    'bowler_type': bowler_type,
                    'gpt_feedback': gpt_feedback,
                    'filename': filename
                }
                
                # Generate and save report
                logger.info("Generating bowling report...")
                try:
                    report_path = generate_report(results, 'bowler', None, None, bowler_side, bowler_type, filename)
                    results['report_path'] = report_path
                    logger.info(f"Report saved to: {report_path}")
                except Exception as e:
                    logger.error(f"Error generating report: {str(e)}", exc_info=True)
                    results['report_path'] = None
                
                # Save results as JSON for later retrieval
                results_file = os.path.join(UPLOAD_FOLDER, f"results_{filename}.json")
                with open(results_file, 'w') as f:
                    json.dump(results, f, indent=2)
                logger.info(f"Results saved to: {results_file}")

            logger.info("Processing completed successfully")
            return jsonify(results)
            
        except Exception as e:
            logger.error(f"Error during processing: {str(e)}", exc_info=True)
            return jsonify({'error': f'Error processing video: {str(e)}'}), 500
    
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

@app.route('/api/results/<filename>', methods=['GET'])
@require_auth
def get_analysis_results(filename):
    """Get analysis results for a specific file (user-specific)"""
    try:
        # Get user info from authentication
        user_id = request.user['user_id']
        username = request.user['username']
        print(f"Getting results for {filename} by user: {username} (ID: {user_id})")
        
        # Look for the results in the upload folder
        results_file = os.path.join(UPLOAD_FOLDER, f"results_{filename}.json")
        if os.path.exists(results_file):
            with open(results_file, 'r') as f:
                results = json.load(f)
            
            # Check if the results belong to the authenticated user
            result_user_id = results.get('user_id')
            if result_user_id != user_id:
                print(f"Access denied: User {username} tried to access results for user ID {result_user_id}")
                return jsonify({'error': 'Access denied'}), 403
            
            print(f"Results found and access granted for user {username}")
            return jsonify(results)
        else:
            print(f"Results not found for {filename}")
            return jsonify({'error': 'Results not found'}), 404
    except Exception as e:
        print(f"Error retrieving results: {str(e)}")
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
        
        history = []
        for file in os.listdir(UPLOAD_FOLDER):
            if file.startswith('results_') and file.endswith('.json'):
                file_path = os.path.join(UPLOAD_FOLDER, file)
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
        
        deleted_count = 0
        files_to_delete = []
        
        # Find all result files for this user
        for file in os.listdir(UPLOAD_FOLDER):
            if file.startswith('results_') and file.endswith('.json'):
                file_path = os.path.join(UPLOAD_FOLDER, file)
                
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        result_data = json.load(f)
                    
                    # Check if this result belongs to the authenticated user
                    result_user_id = result_data.get('user_id')
                    if result_user_id == user_id:
                        files_to_delete.append(file_path)
                        
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
        
        # Get the analysis results
        results_file = os.path.join(UPLOAD_FOLDER, f"results_{filename}.json")
        if not os.path.exists(results_file):
            print(f"Analysis results not found for {filename}")
            return jsonify({'error': 'Analysis results not found'}), 404
        
        print(f"Found analysis results for {filename}")
        
        with open(results_file, 'r') as f:
            results = json.load(f)
        
        # Check if the results belong to the authenticated user
        result_user_id = results.get('user_id')
        if result_user_id != user_id:
            print(f"Access denied: User {username} tried to generate training plan for user ID {result_user_id}")
            return jsonify({'error': 'Access denied'}), 403
        
        # Extract data for training plan
        gpt_feedback = results.get('gpt_feedback', {})
        player_type = results.get('player_type', 'batsman')
        shot_type = results.get('shot_type')
        bowler_type = results.get('bowler_type')
        
        # Find the report file
        report_path = None
        if results.get('report_path'):
            report_path = results.get('report_path')
            print(f"Using report from results: {report_path}")
        else:
            # Try to find the report file by pattern
            for file in os.listdir(UPLOAD_FOLDER):
                if file.startswith('report_') and file.endswith('.txt'):
                    # Check if this report is for the same analysis
                    if filename in file or file.replace('report_', '').replace('.txt', '') in filename:
                        report_path = os.path.join(UPLOAD_FOLDER, file)
                        print(f"Found matching report: {report_path}")
                        break
        
        if not report_path:
            print(f"No report file found for {filename}")
        
        # Generate training plan
        print(f"Generating {days}-day training plan for {filename}...")
        training_plan = generate_training_plan(
            gpt_feedback=gpt_feedback,
            player_type=player_type,
            shot_type=shot_type,
            bowler_type=bowler_type,
            days=days,
            report_path=report_path
        )
        
        # Save training plan
        plan_file = os.path.join(UPLOAD_FOLDER, f"training_plan_{filename}.json")
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
        
        plan_file = os.path.join(UPLOAD_FOLDER, f"training_plan_{filename}.json")
        if os.path.exists(plan_file):
            print(f"Training plan found for {filename}")
            
            # Check if the corresponding analysis results belong to the authenticated user
            results_file = os.path.join(UPLOAD_FOLDER, f"results_{filename}.json")
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
            return jsonify({'error': 'Invalid username or password'}), 401
        
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
    