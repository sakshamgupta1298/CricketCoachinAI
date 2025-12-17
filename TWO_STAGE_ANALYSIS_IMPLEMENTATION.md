# Two-Stage Analysis Implementation

## Overview
The feedback system now uses a **two-stage analysis approach**:
1. **Stage 1 (Prompt A)**: Biomechanical Analyst - Analyzes pose keypoint data and computes biomechanical features
2. **Stage 2 (Prompt B)**: Elite Coach - Interprets the biomechanics report and provides coaching guidance

## Changes Made

### 1. Function Signature Update
```python
# Before
def get_feedback_from_gpt(action_type, keypoint_csv_path):

# After  
def get_feedback_from_gpt(action_type, keypoint_csv_path, player_level='intermediate'):
```
- Added optional `player_level` parameter (defaults to 'intermediate')
- Accepts: 'beginner', 'intermediate', 'advanced', 'elite'

### 2. Two-Stage Flow Implementation

#### Stage 1: Biomechanical Analysis
- Runs `prompt_A` (Cricket Biomechanics Analyst)
- Returns structured biomechanics report with:
  - Data quality assessment
  - Selected features (core, conditional, inferred)
  - Biomechanical measurements
  - Deviations from cricket norms

#### Stage 2: Coach Interpretation
- Takes biomechanics report from Stage 1
- Runs `prompt_B` (Elite Cricket Batting Coach)
- Converts biomechanical deviations into coaching guidance:
  - Confirmed faults (max 3)
  - Coaching focus
  - Drill recommendations
  - Coach notes

### 3. Response Structure

The function now returns a combined structure:

```json
{
  "biomechanics_report": {
    "analysis_summary": "...",
    "data_quality": {...},
    "selected_features": {...},
    "biomechanics": {...},
    "deviations": [...]
  },
  "coaching_feedback": {
    "coaching_focus": "...",
    "confirmed_faults": [...],
    "coach_notes": [...]
  },
  "shot_type": "coverdrive",
  "player_level": "intermediate",
  
  // Backward compatibility fields
  "analysis_summary": "...",
  "analysis": "...",
  "flaws": [...],
  "technical_flaws": [...],
  "coach_notes": [...],
  "coaching_focus": "...",
  "general_tips": [...],
  "biomechanical_features": {...},
  "data_quality": {...},
  "selected_features": {...},
  "deviations": [...]
}
```

### 4. Error Handling

- **Stage 1 Failure**: Returns error with stage identifier
- **Stage 2 Failure**: Returns biomechanics report + error message (partial success)
- Both stages have try-catch blocks with detailed logging

### 5. Training Plan Generation Update

Updated `generate_training_plan()` to handle both:
- **New format**: `biomechanics_report` + `coaching_feedback`
- **Old format**: Flat structure (backward compatible)

## Benefits

1. **Separation of Concerns**: Biomechanics analysis separate from coaching interpretation
2. **Better Accuracy**: Coach focuses on interpretation, not computation
3. **Player-Level Adaptation**: Coaching adjusts to player skill level
4. **Data-Driven**: Strict tier system prevents over-interpretation
5. **Backward Compatible**: Frontend continues to work without changes

## Frontend Compatibility

The frontend already handles multiple formats:
- `flaws` or `technical_flaws` arrays
- `analysis` or `analysis_summary` strings
- Old and new injury risk formats

The new structure maintains backward compatibility by flattening key fields.

## Usage Example

```python
# Basic usage (defaults to intermediate level)
feedback = get_feedback_from_gpt('coverdrive', '/path/to/keypoints.csv')

# With player level
feedback = get_feedback_from_gpt('coverdrive', '/path/to/keypoints.csv', 'beginner')

# Access biomechanics report
biomechanics = feedback['biomechanics_report']

# Access coaching feedback
coaching = feedback['coaching_feedback']

# Or use backward-compatible fields
flaws = feedback['flaws']
coach_notes = feedback['coach_notes']
```

## Logging

The function logs:
- Stage 1 start/completion
- Stage 2 start/completion
- Errors at each stage
- Final success message

Check logs for: `"Stage 1: Running biomechanical analysis"` and `"Stage 2: Running coach interpretation"`

## Testing

To test the two-stage flow:
1. Upload a batting video
2. Check logs for both stage messages
3. Verify response contains both `biomechanics_report` and `coaching_feedback`
4. Verify backward-compatible fields are present

## Future Enhancements

- Add player level selection in frontend
- Cache biomechanics reports for faster re-analysis
- Add biomechanics-only endpoint for advanced users
- Support for custom coaching styles

