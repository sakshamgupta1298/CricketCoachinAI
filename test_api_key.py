from openai import OpenAI
client = OpenAI(api_key="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")

try:
    client.models.list()
    print("API key works!")
except Exception as e:
    print("Error:", e)
