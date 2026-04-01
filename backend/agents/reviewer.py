from utils.llm import call_llm

SYSTEM = (
    "You review hiring notes and decisions. "
    "Point out what is solid, what is missing, and what to verify next."
)


def review(text: str) -> str:
    return call_llm(f"{SYSTEM}\n\n{text}")
