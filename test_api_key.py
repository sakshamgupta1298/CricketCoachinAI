from openai import OpenAI
client = OpenAI(api_key="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")

try:
    client.models.list()
    print("API key works!")
except Exception as e:
    print("Error:", e)
