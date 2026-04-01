from utils.llm import call_llm
import json

SYSTEM = (
    "You are an expert hiring evaluator. You assess candidate interview answers "
    "based on the job description and score them across structured interview dimensions."
)


def evaluate_answers(answers: list, job_description: str):
    prompt = f"""
    Job Description:
    {job_description}

    Candidate Answers:
    {answers}

    Evaluate answers separately for:

    1. Behavioral performance:
       - leadership
       - teamwork
       - conflict handling

    2. Cultural fit:
       - alignment with company values
       - collaboration
       - adaptability

    3. Technical competency:
       - role-specific knowledge
       - problem solving ability

    Also evaluate:
    - communication clarity

    Identify:
    - strengths
    - weaknesses
    - risk flags (red flags or concerns)

    Return ONLY valid JSON:
    {{
      "behavioral_score": int,
      "cultural_fit_score": int,
      "technical_score": int,
      "communication_score": int,
      "strengths": [],
      "weaknesses": [],
      "risk_flags": [],
      "final_decision": "Hire/Reject"
    }}
    """

    response = call_llm(f"{SYSTEM}\n\n{prompt}")

    try:
        return json.loads(response)
    except Exception:
        return {
            "error": "Invalid JSON from LLM",
            "raw_response": response
        }