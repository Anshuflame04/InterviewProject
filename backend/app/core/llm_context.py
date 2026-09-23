from contextvars import ContextVar

from fastapi import HTTPException, status


LlmConfig = tuple[str, str, str]
_llm_config: ContextVar[LlmConfig | None] = ContextVar("llm_config", default=None)


def set_llm_config(provider: str | None, model: str | None, api_key: str | None) -> None:
    if not provider and not model and not api_key:
        return
    if provider not in {"gemini", "groq"} or not model or not api_key:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose an AI provider, model, and API key in API Setup.")
    _llm_config.set((provider, model, api_key))


def get_llm_config() -> LlmConfig:
    config = _llm_config.get()
    if not config:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Set up your Gemini or Groq API key before using AI features.")
    return config
