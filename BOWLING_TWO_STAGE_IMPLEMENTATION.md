# Bowling Two-Stage Analysis Implementation

## Overview
The bowling feedback system now uses the same **two-stage analysis approach** as batting:
1. **Stage 1 (Prompt A)**: Biomechanical Analyst - Analyzes pose keypoint data and computes biomechanical features for bowling
2. **Stage 2 (Prompt B)**: Elite Bowling Coach - Interprets the biomechanics report and provides bowling-specific coaching guidance

## Changes Made

### 1. Function Signature Update
```python
# Before
def get_feedback_from_gpt_for_bowling(keypoint_csv_path, bowler_type='fast_bowler'):

# After  
def get_feedback_from_gpt_for_bowling(keypoint_csv_path, bowler_type='fast_bowler', player_level='intermediate'):
```
- Added optional `player_level` parameter (defaults to 'intermediate')
- Accepts: 'beginner', 'intermediate', 'advanced', 'elite'

### 2. Two-Stage Flow Implementation

#### Stage 1: Biomechanical Analysis (Bowling-Specific)
- Runs `prompt_A` (Cricket Biomechanics Analyst for Bowling)
- Returns structured biomechanics report with:
  - Data quality assessment
  - Selected features (core, conditional, inferred)
  - Biomechanical measurements specific to bowling
  - Deviations from cricket bowling norms
  - Injury risk assessment (bowling-specific: back, shoulder, elbow, knee, ankle)

#### Stage 2: Coach Interpretation (Bowling-Specific)
- Takes biomechanics report from Stage 1
- Runs `prompt_B` (Elite Cricket Bowling Coach)
- Converts biomechanical deviations into coaching guidance:
  - Confirmed faults (max 3)
  - Coaching focus
  - Drill recommendations (bowling-specific)
  - Injury risk guidance
  - Coach notes

### 3. Bowling-Specific Features

#### Biomechanical Features (Tier 1 - Core)
- Run-up speed (estimated m/s)
- Approach rhythm consistency
- Trunk lean at delivery
- Shoulder rotation angle
- Hip–shoulder separation (X-factor)
- Front knee flexion at front-foot contact
- Front-foot stride length
- Arm path plane (over-the-top / round-arm)
- Release height consistency

#### Bowling-Type Adaptation
- **Fast Bowling**: Higher run-up speed, stride length, hip-shoulder separation norms
- **Spin Bowling**: Moderate run-up speed, upright trunk, wrist-dominant release norms

### 4. Response Structure

The function returns a combined structure:

```json
{
  "biomechanics_report": {
    "analysis_summary": "...",
    "data_quality": {...},
    "selected_features": {...},
    "biomechanics": {...},
    "deviations": [...],
    "injury_risk_assessment": [...]
  },
  "coaching_feedback": {
    "coaching_focus": "...",
    "confirmed_faults": [...],
    "injury_risk_guidance": [...],
    "coach_notes": [...]
  },
  "bowler_type": "fast_bowler",
  "bowling_type": "fast",
  "player_level": "intermediate",
  
  // Backward compatibility fields
  "analysis_summary": "...",
  "analysis": "...",
  "flaws": [...],
  "technical_flaws": [...],
  "coach_notes": [...],
  "coaching_focus": "...",
  "general_tips": [...],
  "injury_risk_assessment": [...],
  "injury_risks": [...],
  "biomechanical_features": {...},
  "data_quality": {...},
  "selected_features": {...},
  "deviations": [...]
}
```

### 5. Error Handling

- **Stage 1 Failure**: Returns error with stage identifier
- **Stage 2 Failure**: Returns biomechanics report + error message (partial success)
- Both stages have try-catch blocks with detailed logging

### 6. Injury Risk Assessment

Bowling-specific injury risks assessed:
- **Lower back**: Hyperextension / lateral flexion
- **Shoulder**: Over-rotation / load
- **Elbow**: Especially for spinners
- **Knee & Ankle**: Braking forces

## Benefits

1. **Consistent Architecture**: Same two-stage pattern as batting
2. **Separation of Concerns**: Biomechanics analysis separate from coaching
3. **Bowling-Specific**: Adapts to fast vs spin bowling norms
4. **Player-Level Adaptation**: Coaching adjusts to skill level
5. **Injury Awareness**: Biomechanical injury risk assessment
6. **Backward Compatible**: Frontend continues to work

## Usage Example

```python
# Basic usage (defaults to intermediate level)
feedback = get_feedback_from_gpt_for_bowling('/path/to/keypoints.csv', 'fast_bowler')

# With player level
feedback = get_feedback_from_gpt_for_bowling('/path/to/keypoints.csv', 'spin_bowler', 'beginner')

# Access biomechanics report
biomechanics = feedback['biomechanics_report']

# Access coaching feedback
coaching = feedback['coaching_feedback']

# Access injury risks
injury_risks = feedback['injury_risk_assessment']
```

## Logging

The function logs:
- Stage 1 start/completion for bowling
- Stage 2 start/completion for bowling
- Errors at each stage
- Final success message

Check logs for: `"Stage 1: Running biomechanical analysis for bowling"` and `"Stage 2: Running coach interpretation for bowling"`

## Testing

To test the two-stage flow for bowling:
1. Upload a bowling video
2. Select bowler type (fast_bowler or spin_bowler)
3. Check logs for both stage messages
4. Verify response contains both `biomechanics_report` and `coaching_feedback`
5. Verify backward-compatible fields are present
6. Verify injury risk assessment is included

## Differences from Batting

1. **Features**: Bowling-specific features (run-up, delivery stride, etc.)
2. **Norms**: Different norms for fast vs spin bowling
3. **Injury Risks**: Bowling-specific injury patterns (back, shoulder, elbow)
4. **Coaching Focus**: Pace generation vs spin control

## Frontend Compatibility

The frontend already handles bowling responses:
- `technical_flaws` or `flaws` arrays
- `injury_risk_assessment` array
- `analysis` or `analysis_summary` strings

The new structure maintains backward compatibility by flattening key fields.

