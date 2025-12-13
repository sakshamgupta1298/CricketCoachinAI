from google import genai
import json
import csv
import os

# --------------------------------------------------
# 1️⃣ CONFIGURE CLIENT
# --------------------------------------------------
client = genai.Client(api_key="AIzaSyCNmpg89-pwOyrimMEmgyt4aT9d07MzYYc")

# models = client.models.list()
# for m in models:
#     print(m)

# --------------------------------------------------
# 2️⃣ INPUTS
# --------------------------------------------------
csv_path = "batting_pose_keypoints.csv"
action_type = "Cover Drive"

# --------------------------------------------------
# 3️⃣ READ CSV & CONVERT TO JSON
# --------------------------------------------------
data = []
with open(csv_path, newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        # Convert numeric fields to float
        data.append({k: float(v) if v.replace('.','',1).isdigit() else v for k,v in row.items()})

csv_json = json.dumps(data)

# --------------------------------------------------
# 4️⃣ PROMPT
# --------------------------------------------------
prompt = f"""
You are a cricket batting coach AI and biomechanics expert.

The predicted shot is: {action_type}

Analyze the pose keypoints from the following data:

{csv_json}

Tasks:
1. Compute biomechanical features relevant to this shot
   (e.g. backlift angle, head stability, front knee flexion,
   hip–shoulder separation, bat swing plane).
2. Compare observed values against ideal professional coaching benchmarks.
3. Identify technical flaws with biomechanical reasoning.
4. Recommend specific drills or corrections.

Rules:
- Use realistic numeric estimates inferred from the data.
- Never return null values.
- Respond ONLY in valid JSON.
- Do not include explanations outside JSON.

Required JSON format:
{{
  "analysis": "string",
  "flaws": [
    {{
      "feature": "string",
      "observed": number,
      "expected_range": "string",
      "issue": "string",
      "recommendation": "string"
    }}
  ],
  "general_tips": ["string"]
}}
"""

# --------------------------------------------------
# 5️⃣ GENERATE RESPONSE
# --------------------------------------------------
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=[prompt]
)

# --------------------------------------------------
# 6️⃣ PARSE & PRINT JSON
# --------------------------------------------------
try:
    result = json.loads(response.text)
    print("\n=== BATSMAN BIOMECHANICS REPORT ===\n")
    print(json.dumps(result, indent=2))
except json.JSONDecodeError:
    print("⚠️ Gemini returned invalid JSON:")
    print(response.text)
