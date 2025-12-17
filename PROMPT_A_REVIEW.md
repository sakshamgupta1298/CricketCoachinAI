# Prompt A Review - Cricket Biomechanics Analyst

## Overview
This prompt is designed for a two-stage analysis system:
1. **Prompt A**: Biomechanical analysis (analyst role)
2. **Prompt B**: Coaching interpretation (coach role)

## ✅ Strengths

1. **Clear Role Separation**: Excellent distinction between analyst and coach roles
2. **Tiered Feature System**: Well-structured Tier 1/2/3 feature classification
3. **Conservative Approach**: Emphasizes under-reporting over over-interpretation
4. **Shot-Specific Norms**: Adjusts expectations based on shot type
5. **Data Quality Awareness**: Includes frame coverage and motion clarity assessment

## ⚠️ Issues Found

### 1. **Critical: Variable Reference Error**
- **Line 1013**: Code uses undefined variable `prompt` instead of `prompt_A`
- **Impact**: Function will crash with `NameError`
- **Fix**: Change `contents=[prompt]` to `contents=[prompt_A]`

### 2. **Prompt B Variable Issues**
- **Lines 943-947**: `prompt_B` references undefined variables:
  - `{action_type}` - exists in function scope ✅
  - `{player_level}` - **NOT DEFINED** ❌
  - `{biomechanics_report}` - **NOT DEFINED** ❌
- **Impact**: `prompt_B` will fail if used
- **Fix**: Either remove `prompt_B` or implement two-stage flow properly

### 3. **JSON Structure Inconsistencies**

#### Issue 3.1: Missing Units
- **Line 888**: `"frame_coverage": "percentage"` - should specify numeric format
- **Recommendation**: Use `"frame_coverage": 85.5` (numeric) or `"frame_coverage": "85.5%"` (string with unit)

#### Issue 3.2: Biomechanics Structure Ambiguity
- **Lines 899-903**: Structure shows empty objects `{}` but doesn't specify format
- **Recommendation**: Add example structure:
```json
"biomechanics": {
  "core": {
    "head_stability_lateral": {
      "observed": 2.5,
      "unit": "cm",
      "ideal_range": "0-5 cm",
      "confidence": "high"
    }
  }
}
```

#### Issue 3.3: Deviation Array Format
- **Lines 905-914**: Format is clear but missing `unit` field
- **Recommendation**: Add unit specification for numeric values

### 4. **Data Size Concerns**
- **Line 788**: `{csv_json}` could be very large for long videos
- **Risk**: Token limit exceeded, API costs, slow processing
- **Recommendation**: 
  - Add data sampling instruction
  - Or pre-process to send summary statistics
  - Or use file upload API if available

### 5. **Feature Tier Logic Ambiguity**

#### Issue 5.1: Tier 2 Confidence
- **Line 840**: Says "Mark all Tier 2 features with 'confidence': 'medium'"
- **But**: Tier 2 features might have high confidence if data quality is good
- **Recommendation**: Change to "Mark Tier 2 features with appropriate confidence based on data quality"

#### Issue 5.2: Tier 3 Estimation
- **Line 848**: Says "Mark all Tier 3 features with 'estimated': true"
- **Issue**: This conflicts with Tier 2 confidence system
- **Recommendation**: Clarify that Tier 3 features should have `"estimated": true` AND appropriate confidence level

### 6. **Missing Validation Instructions**

#### Issue 6.1: Numeric Range Validation
- No instruction to validate numeric ranges are realistic
- **Example**: Head stability shouldn't be 500cm
- **Recommendation**: Add validation constraints

#### Issue 6.2: JSON Schema Validation
- No instruction to ensure JSON is parseable
- **Recommendation**: Add explicit "Output must be valid, parseable JSON" instruction

### 7. **Shot Type Coverage**
- **Lines 854-858**: Only covers 5 shot types
- **Missing**: Straight drive, square cut, sweep, reverse sweep, etc.
- **Recommendation**: Expand or add "default" handling for unspecified shots

### 8. **Feature Selection Gating Clarity**

#### Issue 8.1: Percentage Thresholds
- **Line 812**: "≥70% of frames" - but what if exactly 69%?
- **Recommendation**: Clarify boundary conditions

#### Issue 8.2: Frame Continuity Definition
- **Line 813**: "≥80% frame continuity" - what defines continuity?
- **Recommendation**: Define continuity (e.g., consecutive frames vs. total frames)

## 🔧 Recommended Fixes

### Fix 1: Correct Variable Reference
```python
# Line 1011-1014
try:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[prompt_A]  # Changed from 'prompt'
    )
```

### Fix 2: Complete Two-Stage Flow (if intended)
```python
# After prompt_A definition
response_A = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[prompt_A]
)
biomechanics_report = response_A.text

# Then use prompt_B with proper variables
player_level = "intermediate"  # Get from user or default
prompt_B = f"""
...
Shot Type: {action_type}
Player Level: {player_level}
Biomechanics Report (JSON):
{biomechanics_report}
...
"""
```

### Fix 3: Improve JSON Structure Specification
Add to prompt_A:
```
"biomechanics": {
  "core": {
    "feature_name": {
      "observed": <number>,
      "unit": "cm | degrees | m/s | etc",
      "ideal_range": "cricket-norm range",
      "confidence": "high | medium | low"
    }
  }
}
```

### Fix 4: Add Data Sampling Instruction
```
────────────────────────
DATA PROCESSING
────────────────────────
If the input data exceeds 1000 frames, sample representative frames:
- Include setup phase (first 20%)
- Include key motion phases (middle 60%)
- Include impact/follow-through (last 20%)
Maintain temporal order in sampling.
```

## 📋 Prompt Quality Score: 8/10

**Strengths**: Well-structured, clear role definition, good feature tiering
**Weaknesses**: Implementation bugs, missing variable definitions, JSON structure ambiguity

## 🎯 Priority Actions

1. **HIGH**: Fix `prompt` → `prompt_A` variable reference
2. **HIGH**: Either remove `prompt_B` or implement two-stage flow properly
3. **MEDIUM**: Clarify JSON structure with examples
4. **MEDIUM**: Add data size handling instructions
5. **LOW**: Expand shot type coverage
6. **LOW**: Add numeric validation constraints

