from utils.llm import call_llm
import json

SYSTEM = (
    "You are an AI interviewer. Your job is to generate targeted behavioral "
    "interview questions based on the candidate's resume and the job description."
)


def generate_questions(resume: str, job_description: str):
    prompt = f"""
Resume:
{resume}

Job Description:
{job_description}

Generate interview questions divided into 3 sections:

1. Behavioral (leadership, teamwork, conflict)
2. Cultural Fit (values, collaboration, adaptability)
3. Technical (role-specific skills based on job description)

Each section should have 2 questions.

Make questions specific to the candidate and role.

Return ONLY valid JSON:
{{
  "behavioral": ["q1", "q2"],
  "cultural": ["q1", "q2"],
  "technical": ["q1", "q2"]
}}
"""
    response = call_llm(f"{SYSTEM}\n\n{prompt}")
    return json.loads(response)