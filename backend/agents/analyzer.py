import json
import re

from utils.llm import call_llm

PROMPT = """You compare a resume to a job description.

Reply with only a JSON object (no markdown, no extra text) using exactly these keys:
- skills_score: integer from 0 to 100 (how well skills match the role)
- experience_score: integer from 0 to 100 (how well experience matches the role)
- summary: one short paragraph (plain string, no line breaks that break JSON)

Use double quotes for JSON strings."""


def analyze_resume(resume: str, job_description: str) -> str:
    user = f"Job description:\n{job_description}\n\nResume:\n{resume}"
    raw = call_llm(f"{PROMPT}\n\n{user}").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\s*```\s*$", "", raw)
    data = json.loads(raw)
    out = {
        "skills_score": int(data["skills_score"]),
        "experience_score": int(data["experience_score"]),
        "summary": str(data["summary"]),
    }
    return json.dumps(out)
