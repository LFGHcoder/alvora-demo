from utils.llm import call_llm

SYSTEM = (
    "You flag potential bias in hiring language or criteria. "
    "List concerns plainly and suggest neutral alternatives where useful."
)


def check_bias(text: str) -> str:
    return call_llm(f"{SYSTEM}\n\n{text}")
