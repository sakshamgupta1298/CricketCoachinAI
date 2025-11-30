# Detailed Code Changes: GPT to Gemini API

This document shows exact code changes needed for each location.

---

## 1. Import Statement (Line 11)

### ❌ Current (OpenAI):
```python
from openai import OpenAI
```

### ✅ New (Gemini):
```python
import google.generativeai as genai
```

---

## 2. Client Initialization (Lines 147-148)

### ❌ Current (OpenAI):
```python
# OpenAI client
client = OpenAI(api_key="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")
```

### ✅ New (Gemini):
```python
# Google Gemini client
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "your-gemini-api-key-here"))
```

**Better approach (using environment variable):**
```python
# Google Gemini client
import os
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")
genai.configure(api_key=GEMINI_API_KEY)
```

---

## 3. Function: `get_feedback_from_gpt_for_bowling()` (Lines 249-329)

### ❌ Current (OpenAI):
```python
def get_feedback_from_gpt_for_bowling(keypoint_csv_path, bowler_type='fast_bowler'):
    print("bowling:", bowler_type)

    # Upload the CSV file to OpenAI
    file_obj = client.files.create(
        file=open(keypoint_csv_path, "rb"),
        purpose="assistants"
    )
    bowling_type = bowler_type.split("_")[0]
    print("bowling_type:", bowling_type)
    # Prompt GPT with explicit JSON structure instructions
    prompt = f"""
You are a cricket bowling coach AI and biomechanics expert in cricket.

Bowler type: **{bowling_type}**

Analyze the pose keypoints from the uploaded CSV file (file_id: {file_obj.id}).
Please perform a comprehensive analysis of the {bowling_type} bowler's biomechanics and provide:
...
"""

    # Request GPT to respond in JSON-only mode
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    # Parse GPT's JSON output safely
    raw_content = response.choices[0].message.content
    try:
        json_text = re.search(r"\{.*\}", raw_content, re.DOTALL).group()
        return json.loads(json_text)
    except Exception as e:
        print("Failed to parse GPT response:", e)
        return {"error": "Failed to parse GPT response", "raw_content": raw_content}
```

### ✅ New (Gemini):
```python
def get_feedback_from_gpt_for_bowling(keypoint_csv_path, bowler_type='fast_bowler'):
    print("bowling:", bowler_type)

    # Read CSV file content directly
    with open(keypoint_csv_path, 'r') as f:
        csv_content = f.read()
    
    bowling_type = bowler_type.split("_")[0]
    print("bowling_type:", bowling_type)
    
    # Prompt Gemini with explicit JSON structure instructions
    prompt = f"""
You are a cricket bowling coach AI and biomechanics expert in cricket.

Bowler type: **{bowling_type}**

Analyze the pose keypoints from the CSV data below.
Please perform a comprehensive analysis of the {bowling_type} bowler's biomechanics and provide:

1. **Biomechanical Assessment**: Analyze run-up, gather, delivery stride, follow-through specific to {bowling_type} bowling.
2. **Performance Metrics**: Evaluate pace generation (for fast bowlers) or spin generation (for spin bowlers), accuracy, and line-length consistency  
3. **Injury Risk Assessment**: Identify potential injury risks based on joint movements for {bowling_type} bowling
4. **Technical Analysis**: Compare against ideal {bowling_type} bowling benchmarks
5. **Improvement Recommendations**: Provide specific drills and corrections for {bowling_type} bowling

CSV Data:
{csv_content}

Respond in JSON format like:

```json
{{
  "analysis": "Comprehensive analysis of the {bowling_type} bowling technique...",
  "biomechanical_features": {{
    "run_up_speed": {{
      "observed": 8.5,
      "expected_range": "10-12" if "{bowling_type}" == "fast" else "6-8",
      "analysis": "Run-up speed analysis for {bowling_type} bowling"
    }},
    "delivery_stride": {{
      "observed": 2.1,
      "expected_range": "1.8-2.2" if "{bowling_type}" == "fast" else "1.5-1.8",
      "analysis": "Delivery stride analysis for {bowling_type} bowling"
    }}
  }},
  "flaws": [
    {{
      "feature": "run_up_speed",
      "observed": 8.5,
      "expected_range": "10-12" if "{bowling_type}" == "fast" else "6-8",
      "issue": "Run-up too slow for {bowling_type} bowling",
      "recommendation": "Increase run-up speed gradually"
    }}
  ],
  "injury_risks": [
    "Shoulder strain due to excessive rotation",
    "Lower back stress from poor follow-through"
  ],
  "general_tips": ["Improve follow-through", "Focus on wrist position", "Work on core strength"]
}}
```

Respond ONLY with valid JSON, no markdown formatting.
"""

    # Request Gemini to respond in JSON-only mode
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "response_mime_type": "application/json"
            }
        )
        
        # Parse Gemini's JSON output safely
        raw_content = response.text
        try:
            # Remove markdown code blocks if present
            json_text = re.sub(r'```json\s*|\s*```', '', raw_content, flags=re.DOTALL).strip()
            json_text = re.search(r"\{.*\}", json_text, re.DOTALL).group()
            return json.loads(json_text)
        except Exception as e:
            print("Failed to parse Gemini response:", e)
            return {"error": "Failed to parse Gemini response", "raw_content": raw_content}
    except Exception as e:
        print("Failed to get response from Gemini:", e)
        return {"error": "Failed to get response from Gemini", "raw_content": str(e)}
```

---

## 4. Function: `get_feedback_from_gpt()` (Lines 502-553)

### ❌ Current (OpenAI):
```python
def get_feedback_from_gpt(action_type, keypoint_csv_path):
    # Upload the CSV file to OpenAI (stored temporarily on their server)
    file_obj = client.files.create(
        file=open(keypoint_csv_path, "rb"),
        purpose="assistants"  # or "fine-tune" if training
    )

    prompt = f"""
You are a cricket batting coach AI and biomechanics expert.

The predicted shot is: **{action_type}**

Please analyze the pose keypoints from the uploaded CSV file (file_id: {file_obj.id}).
...
"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )

    raw_content = response.choices[0].message.content
    try:
        json_text = re.search(r"\{.*\}", raw_content, re.DOTALL).group()
        return json.loads(json_text)
    except Exception as e:
        print("Failed to parse GPT response:", e)
        return {"error": "Failed to parse GPT response", "raw_content": raw_content}
```

### ✅ New (Gemini):
```python
def get_feedback_from_gpt(action_type, keypoint_csv_path):
    # Read CSV file content directly
    with open(keypoint_csv_path, 'r') as f:
        csv_content = f.read()

    prompt = f"""
You are a cricket batting coach AI and biomechanics expert.

The predicted shot is: **{action_type}**

Please analyze the pose keypoints from the CSV data below.

CSV Data:
{csv_content}

1. Compute biomechanical features relevant to this shot.
2. Compare values against ideal coaching benchmarks.
3. Identify flaws with reasoning.
4. Recommend drills or corrections.

Respond in JSON format like:

```json
{{
  "analysis": "...",
  "flaws": [
    {{
      "feature": "backlift_angle",
      "observed": 158.4,
      "expected_range": "45-65",
      "issue": "Too high for cover drive",
      "recommendation": "Use mirror drill to restrict backlift"
    }}
  ],
  "general_tips": ["Improve head stability", "Use shadow practice"]
}}
```

Respond ONLY with valid JSON, no markdown formatting.
"""

    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "response_mime_type": "application/json"
            }
        )
        
        raw_content = response.text
        try:
            # Remove markdown code blocks if present
            json_text = re.sub(r'```json\s*|\s*```', '', raw_content, flags=re.DOTALL).strip()
            json_text = re.search(r"\{.*\}", json_text, re.DOTALL).group()
            return json.loads(json_text)
        except Exception as e:
            print("Failed to parse Gemini response:", e)
            return {"error": "Failed to parse Gemini response", "raw_content": raw_content}
    except Exception as e:
        print("Failed to get response from Gemini:", e)
        return {"error": "Failed to get response from Gemini", "raw_content": str(e)}
```

---

## 5. Function: `generate_training_plan()` (Lines 556-633)

### ❌ Current (OpenAI):
```python
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content
        json_text = re.search(r"\{.*\}", raw, re.DOTALL).group()
        plan_json = json.loads(json_text)
        return plan_json
    except Exception as e:
        logging.exception("Failed to generate training plan from GPT")
        # Fallback simple plan
        ...
```

### ✅ New (Gemini):
```python
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.2,
                "response_mime_type": "application/json"
            }
        )
        raw = response.text
        # Remove markdown code blocks if present
        json_text = re.sub(r'```json\s*|\s*```', '', raw, flags=re.DOTALL).strip()
        json_text = re.search(r"\{.*\}", json_text, re.DOTALL).group()
        plan_json = json.loads(json_text)
        return plan_json
    except Exception as e:
        logging.exception("Failed to generate training plan from Gemini")
        # Fallback simple plan
        ...
```

---

## 6. requirements.txt

### ❌ Current:
```
# OpenAI API
openai
```

### ✅ New:
```
# Google Gemini API
google-generativeai
```

---

## 7. env.example

### ❌ Current:
```
# OpenAI API Key (if needed)
OPENAI_API_KEY=your_openai_api_key_here
```

### ✅ New:
```
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 📌 Key Differences Summary

| Aspect | OpenAI | Gemini |
|--------|--------|--------|
| **Import** | `from openai import OpenAI` | `import google.generativeai as genai` |
| **Client Init** | `client = OpenAI(api_key=...)` | `genai.configure(api_key=...)` |
| **Model** | `"gpt-4o"` | `"gemini-1.5-pro"` or `"gemini-1.5-flash"` |
| **File Upload** | `client.files.create()` | Read file and include in prompt |
| **API Call** | `client.chat.completions.create()` | `model.generate_content()` |
| **Messages** | `messages=[{"role": "user", "content": ...}]` | Direct prompt string |
| **JSON Mode** | `response_format={"type": "json_object"}` | `response_mime_type: "application/json"` |
| **Response Access** | `response.choices[0].message.content` | `response.text` |
| **Temperature** | `temperature=0.3` | `generation_config={"temperature": 0.3}` |

---

## ⚠️ Important Notes

1. **File Size Limits**: Gemini has different token limits. Very large CSV files might need chunking or summarization.

2. **Rate Limits**: Gemini API has different rate limits than OpenAI. Monitor usage accordingly.

3. **Error Messages**: Update all error messages that mention "GPT" to "Gemini" or "AI" for consistency.

4. **Testing**: Test each function thoroughly after migration, especially JSON parsing.

5. **API Key Security**: Move hardcoded API key to environment variable for security.

