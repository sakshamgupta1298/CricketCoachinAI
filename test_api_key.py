from openai import OpenAI
client = OpenAI(api_key="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")

try:
    client.models.list()
    print("API key works!")
except Exception as e:
    print("Error:", e)
