# Gemini API Migration Guide

This document shows all the places where you need to make changes to replace GPT API with Gemini API.

---

## 📋 Summary of Changes Required

### Files to Modify:
1. **backend_script.py** - Main backend file (3 functions + 1 import + 1 client initialization)
2. **requirements.txt** - Update dependencies
3. **env.example** - Update environment variable name
4. **README.md** - Update documentation (optional)

---

## 🔧 Detailed Changes

### 1. **backend_script.py** - Line 11
**Current:**
```python
from openai import OpenAI
```

**Change to:**
```python
import google.generativeai as genai
```

---

### 2. **backend_script.py** - Line 147-148
**Current:**
```python
# OpenAI client
client = OpenAI(api_key="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")
```

**Change to:**
```python
# Google Gemini client
genai.configure(api_key=os.getenv("GEMINI_API_KEY", "your-gemini-api-key-here"))
```

**Note:** Consider using environment variable instead of hardcoding the API key.

---

### 3. **backend_script.py** - Function `get_feedback_from_gpt_for_bowling()` (Lines 249-329)

**Current Implementation:**
- Uses `client.files.create()` to upload CSV file
- Uses `client.chat.completions.create()` with model "gpt-4o"
- Uses file_id in prompt

**Key Changes Needed:**
- **Line 252-256:** Remove file upload (Gemini doesn't use file uploads the same way)
- **Line 265:** Remove file_id reference from prompt
- **Line 309-314:** Replace OpenAI API call with Gemini API call
- **Line 317:** Update response parsing (Gemini response structure is different)

**New Implementation Should:**
- Read CSV file content directly
- Include CSV content in the prompt (or use Gemini's file upload if supported)
- Use `genai.GenerativeModel()` instead of `client.chat.completions.create()`
- Parse Gemini's response format

---

### 4. **backend_script.py** - Function `get_feedback_from_gpt()` (Lines 502-553)

**Current Implementation:**
- Uses `client.files.create()` to upload CSV file
- Uses `client.chat.completions.create()` with model "gpt-4o"
- Uses file_id in prompt

**Key Changes Needed:**
- **Line 503-507:** Remove file upload
- **Line 514:** Remove file_id reference from prompt
- **Line 539-545:** Replace OpenAI API call with Gemini API call
- **Line 547-553:** Update response parsing

**New Implementation Should:**
- Read CSV file content directly or use Gemini's file handling
- Include CSV content in the prompt
- Use `genai.GenerativeModel()` instead
- Parse Gemini's response format

---

### 5. **backend_script.py** - Function `generate_training_plan()` (Lines 556-633)

**Current Implementation:**
- Uses `client.chat.completions.create()` with model "gpt-4o"
- Uses `response_format={"type": "json_object"}`

**Key Changes Needed:**
- **Line 604-609:** Replace OpenAI API call with Gemini API call
- **Line 610-612:** Update response parsing

**New Implementation Should:**
- Use `genai.GenerativeModel()` with JSON generation mode
- Parse Gemini's response format

---

### 6. **requirements.txt** - Line 27-28
**Current:**
```
# OpenAI API
openai
```

**Change to:**
```
# Google Gemini API
google-generativeai
```

---

### 7. **env.example** - Line 14-15
**Current:**
```
# OpenAI API Key (if needed)
OPENAI_API_KEY=your_openai_api_key_here
```

**Change to:**
```
# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🔄 API Call Pattern Changes

### OpenAI Pattern (Current):
```python
# File upload
file_obj = client.files.create(
    file=open(keypoint_csv_path, "rb"),
    purpose="assistants"
)

# Chat completion
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3,
    response_format={"type": "json_object"}
)

# Response access
raw_content = response.choices[0].message.content
```

### Gemini Pattern (New):
```python
# Configure model
model = genai.GenerativeModel('gemini-1.5-pro')  # or 'gemini-1.5-flash'

# For file handling, you can either:
# Option 1: Read CSV and include in prompt
with open(keypoint_csv_path, 'r') as f:
    csv_content = f.read()
prompt_with_data = f"{prompt}\n\nCSV Data:\n{csv_content}"

# Option 2: Use Gemini's file upload (if supported)
# Upload file first, then reference it

# Generate content
response = model.generate_content(
    prompt_with_data,
    generation_config={
        "temperature": 0.3,
        "response_mime_type": "application/json"  # For JSON responses
    }
)

# Response access
raw_content = response.text
```

---

## 📝 Additional Considerations

### 1. **File Handling**
- Gemini API handles files differently than OpenAI
- You may need to read CSV content and include it directly in the prompt
- Or use Gemini's file upload API if available

### 2. **Model Selection**
- Replace `"gpt-4o"` with Gemini models:
  - `"gemini-1.5-pro"` - Most capable (similar to GPT-4)
  - `"gemini-1.5-flash"` - Faster, cheaper (similar to GPT-3.5)

### 3. **Response Format**
- Gemini supports JSON mode via `response_mime_type: "application/json"`
- Response parsing may need adjustment

### 4. **Error Handling**
- Update error messages from "GPT" to "Gemini" or "AI"
- Keep the same error handling structure

### 5. **Function Names**
- Consider renaming functions:
  - `get_feedback_from_gpt()` → `get_feedback_from_ai()` or `get_feedback_from_gemini()`
  - `get_feedback_from_gpt_for_bowling()` → `get_feedback_from_ai_for_bowling()`
- Or keep names generic if you might switch back

---

## 🎯 Quick Reference: All Locations

| File | Line(s) | Change Type | Description |
|------|---------|-------------|-------------|
| `backend_script.py` | 11 | Import | Change `from openai import OpenAI` to `import google.generativeai as genai` |
| `backend_script.py` | 147-148 | Client Init | Replace OpenAI client with Gemini configuration |
| `backend_script.py` | 249-329 | Function | `get_feedback_from_gpt_for_bowling()` - Replace API calls |
| `backend_script.py` | 502-553 | Function | `get_feedback_from_gpt()` - Replace API calls |
| `backend_script.py` | 556-633 | Function | `generate_training_plan()` - Replace API calls |
| `requirements.txt` | 27-28 | Dependency | Replace `openai` with `google-generativeai` |
| `env.example` | 14-15 | Config | Update API key variable name |

---

## ✅ Testing Checklist

After making changes:
- [ ] Install new dependency: `pip install google-generativeai`
- [ ] Set `GEMINI_API_KEY` environment variable
- [ ] Test batting feedback generation
- [ ] Test bowling feedback generation
- [ ] Test training plan generation
- [ ] Verify JSON response parsing works correctly
- [ ] Check error handling for API failures

---

## 📚 Resources

- [Google Gemini API Documentation](httpss://ai.google.dev/docs)
- [Python SDK for Gemini](httpss://github.com/google/generative-ai-python)
- [Gemini API Quickstart](httpss://ai.google.dev/tutorials/python_quickstart)


