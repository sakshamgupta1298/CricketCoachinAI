# Gemini Response Format Transformation Fix

## Problem

The Gemini API returns a response format that doesn't match what the frontend expects, causing display issues:

### Gemini Format (What Gemini Returns)
```json
{
  "analysis_summary": "...",
  "biomechanics": {
    "core": {...},
    "conditional": {...},
    "inferred": {...}
  },
  "technical_flaws": [
    {
      "feature": "...",
      "deviation": "...",
      "issue": "...",
      "recommendation": "..."
    }
  ],
  "general_tips": [...],
  "selected_features": {...}
}
```

### Frontend Format (What Frontend Expects)
```json
{
  "analysis": "...",
  "biomechanical_features": {
    "feature_name": {
      "observed": number,
      "expected_range": string,
      "analysis": string
    }
  },
  "flaws": [
    {
      "feature": "...",
      "observed": number,
      "expected_range": string,
      "issue": "...",
      "recommendation": "..."
    }
  ],
  "general_tips": [...],
  "injury_risks": [...]
}
```

## Issues Identified

1. **Field Name Mismatches:**
   - `analysis_summary` → should be `analysis`
   - `biomechanics` → should be `biomechanical_features`
   - `technical_flaws` → should be `flaws`

2. **Structure Mismatches:**
   - `biomechanics` has nested structure (`core`, `conditional`, `inferred`) → frontend expects flat object
   - `technical_flaws` items missing `observed` and `expected_range` fields → frontend requires these

3. **Missing Data:**
   - Flaws need `observed` (number) and `expected_range` (string) which must be extracted from biomechanics data

## Solution

Added a transformation function `transform_gemini_response_to_frontend_format()` that:

1. **Renames fields:**
   - `analysis_summary` → `analysis`
   - `biomechanics` → `biomechanical_features`
   - `technical_flaws` → `flaws`

2. **Flattens biomechanics structure:**
   - Combines `core`, `conditional`, and `inferred` into a single flat object
   - Maps `ideal_range` → `expected_range` for consistency

3. **Enriches flaws data:**
   - Extracts `observed` values from biomechanics data
   - Maps `ideal_range` → `expected_range` for each flaw
   - Falls back to parsing deviation text if biomechanics data not available

4. **Transforms injury risks:**
   - Converts `injury_risk_assessment` array of objects → `injury_risks` array of strings

## Implementation

The transformation function is automatically applied in the `/api/upload` endpoint for both batsman and bowler analysis:

```python
gpt_feedback_raw = get_feedback_from_gpt(shot_type, keypoints_path)
gpt_feedback = transform_gemini_response_to_frontend_format(gpt_feedback_raw)
```

## Testing

To verify the fix works:

1. Upload a video through the mobile app
2. Check that the ResultsScreen displays:
   - Analysis summary (from `analysis` field)
   - Biomechanical features (from `biomechanical_features`)
   - Technical flaws with observed values and expected ranges
   - General tips
   - Injury risks (if present)

## Example Transformation

**Input (Gemini):**
```json
{
  "analysis_summary": "Mixed execution...",
  "biomechanics": {
    "core": {
      "Trunk lean": {
        "observed": 1.78,
        "ideal_range": "5-15 degrees",
        "analysis": "Too upright..."
      }
    }
  },
  "technical_flaws": [
    {
      "feature": "Trunk lean",
      "deviation": "Trunk is too upright at impact.",
      "issue": "Limits power...",
      "recommendation": "Drill: Shadow batting..."
    }
  ]
}
```

**Output (Frontend):**
```json
{
  "analysis": "Mixed execution...",
  "biomechanical_features": {
    "Trunk lean": {
      "observed": 1.78,
      "expected_range": "5-15 degrees",
      "analysis": "Too upright..."
    }
  },
  "flaws": [
    {
      "feature": "Trunk lean",
      "observed": 1.78,
      "expected_range": "5-15 degrees",
      "issue": "Limits power...",
      "recommendation": "Drill: Shadow batting..."
    }
  ]
}
```

## Additional Fix: Markdown Code Block Parsing

### Problem
Gemini sometimes wraps JSON responses in markdown code blocks:
```
```json
{...}
```
```

The original regex-based parsing (`r"\{.*\}"`) failed to handle this format, causing parse errors.

### Solution
Added `parse_gemini_json_response()` function that:
1. Strips markdown code block markers (```json ... ```)
2. Extracts JSON using regex
3. Handles trailing comma issues
4. Provides better error messages

This function is now used in both:
- `get_feedback_from_gpt()` (batting analysis)
- `get_feedback_from_gpt_for_bowling()` (bowling analysis)

## Status

✅ **Fixed** - The backend now:
1. Parses Gemini responses even when wrapped in markdown code blocks
2. Transforms Gemini responses to match frontend expectations

