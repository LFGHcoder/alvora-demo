import json

import boto3

MODEL_ID = "global.amazon.nova-2-lite-v1:0"


def call_llm(prompt: str) -> str:
    client = boto3.client("bedrock-runtime")
    body = {
        "schemaVersion": "messages-v1",
        "messages": [{"role": "user", "content": [{"text": prompt}]}],
        "inferenceConfig": {"maxTokens": 4096, "temperature": 0.7},
    }
    resp = client.invoke_model(
        modelId=MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    payload = json.loads(resp["body"].read())
    blocks = payload["output"]["message"]["content"]
    return "".join(b.get("text", "") for b in blocks if "text" in b)
