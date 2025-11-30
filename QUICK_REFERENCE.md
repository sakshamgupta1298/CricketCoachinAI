# Quick Reference: GPT to Gemini Migration

## 📍 All Change Locations at a Glance

### File: `backend_script.py`

| Line | Current Code | Change Needed |
|------|--------------|---------------|
| **11** | `from openai import OpenAI` | → `import google.generativeai as genai` |
| **147-148** | `client = OpenAI(api_key="...")` | → `genai.configure(api_key=os.getenv("GEMINI_API_KEY"))` |
| **252-256** | `file_obj = client.files.create(...)` | → Read CSV file directly |
| **265** | `file_id: {file_obj.id}` in prompt | → Remove, include CSV content in prompt |
| **309-314** | `client.chat.completions.create(...)` | → `model.generate_content(...)` |
| **317** | `response.choices[0].message.content` | → `response.text` |
| **503-507** | `file_obj = client.files.create(...)` | → Read CSV file directly |
| **514** | `file_id: {file_obj.id}` in prompt | → Remove, include CSV content in prompt |
| **539-545** | `client.chat.completions.create(...)` | → `model.generate_content(...)` |
| **547** | `response.choices[0].message.content` | → `response.text` |
| **604-609** | `client.chat.completions.create(...)` | → `model.generate_content(...)` |
| **610** | `response.choices[0].message.content` | → `response.text` |

### File: `requirements.txt`

| Line | Current | Change To |
|------|---------|-----------|
| **27-28** | `openai` | → `google-generativeai` |

### File: `env.example`

| Line | Current | Change To |
|------|---------|-----------|
| **14-15** | `OPENAI_API_KEY=...` | → `GEMINI_API_KEY=...` |

---

## 🔄 Function-by-Function Changes

### 1. `get_feedback_from_gpt_for_bowling()` (Line 249)
- **Remove**: File upload (lines 252-256)
- **Change**: API call (lines 309-314)
- **Update**: Response parsing (line 317)

### 2. `get_feedback_from_gpt()` (Line 502)
- **Remove**: File upload (lines 503-507)
- **Change**: API call (lines 539-545)
- **Update**: Response parsing (line 547)

### 3. `generate_training_plan()` (Line 556)
- **Change**: API call (lines 604-609)
- **Update**: Response parsing (line 610)

---

## 🎯 Quick Checklist

- [ ] Change import statement (line 11)
- [ ] Replace client initialization (lines 147-148)
- [ ] Update `get_feedback_from_gpt_for_bowling()` function
- [ ] Update `get_feedback_from_gpt()` function
- [ ] Update `generate_training_plan()` function
- [ ] Update `requirements.txt`
- [ ] Update `env.example`
- [ ] Install new package: `pip install google-generativeai`
- [ ] Set `GEMINI_API_KEY` environment variable
- [ ] Test all three functions

---

## 💡 Key Code Pattern

**Before (OpenAI):**
```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3
)
content = response.choices[0].message.content
```

**After (Gemini):**
```python
model = genai.GenerativeModel('gemini-1.5-pro')
response = model.generate_content(
    prompt,
    generation_config={"temperature": 0.3, "response_mime_type": "application/json"}
)
content = response.text
```


