from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict

from agents.analyzer import analyze_resume
from agents.interviewer import generate_questions
from agents.evaluator import evaluate_answers
from agents.reviewer import review_decision
from agents.bias import check_bias

app = FastAPI()


# ---------- Request Models ----------

class AnalyzeBody(BaseModel):
    resume: str
    job_description: str


class InterviewBody(BaseModel):
    resume: str
    job_description: str   # ✅ FIXED


class EvaluateBody(BaseModel):
    answers: List[str]
    job_description: str   # ✅ FIXED


class DecisionBody(BaseModel):
    skills_score: int
    experience_score: int
    interview_score: int


# ---------- Routes ----------

@app.get("/")
def health():
    return {"status": "ok"}


# 1. Analyze Resume
@app.post("/analyze")
def analyze(body: AnalyzeBody):
    return analyze_resume(body.resume, body.job_description)


# 2. Generate Interview Questions
@app.post("/interview")
def interview(body: InterviewBody):
    return {
        "questions": generate_questions(
            body.resume,
            body.job_description   # ✅ FIXED
        )
    }


# 3. Evaluate Answers
@app.post("/evaluate")
def evaluate(body: EvaluateBody):
    return evaluate_answers(
        body.answers,
        body.job_description   # ✅ FIXED
    )


# 4. Final Decision (optional but useful)
@app.post("/decision")
def decision(body: DecisionBody):
    score = (
        body.skills_score +
        body.experience_score +
        body.interview_score
    ) // 3

    final_decision = "Hire" if score > 70 else "Reject"

    return {
        "score": score,
        "decision": final_decision
    }


# 5. Reviewer (second opinion)
@app.post("/review")
def review(data: Dict):
    return review_decision(data)


# 6. Bias Check
@app.post("/bias")
def bias(data: Dict):
    return check_bias(data)