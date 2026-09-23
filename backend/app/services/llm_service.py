import asyncio
import logging
from enum import Enum
from typing import TypeVar

from google import genai
from pydantic import BaseModel

from app.core.llm_context import get_llm_config


logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)


class LLMProvider(str, Enum):
    """
    Supported LLM providers.

    More providers can be added later without changing
    the rest of the application.
    """

    GEMINI = "gemini"


class LLMService:
    """
    Central service for all LLM communication.

    Routers and other services should NOT directly communicate
    with Gemini. They should use this service instead.

    This keeps the application provider-independent.
    """

    def __init__(self) -> None:
        # There is deliberately no application-level API key. A client is
        # created per request from the provider, model, and key supplied by
        # the authenticated user in API Setup.
        pass

    async def generate_text(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        temperature: float = 0.3,
        max_output_tokens: int = 2048,
        retries: int = 2,
    ) -> str:
        """
        Generate a normal text response.

        The Gemini Interactions API is used here.
        """

        last_error: Exception | None = None

        for attempt in range(retries + 1):
            try:
                provider, model, api_key = get_llm_config()

                if provider == LLMProvider.GEMINI.value:

                    client = genai.Client(api_key=api_key)
                    interaction = await client.aio.interactions.create(
                        model=model,
                        input=prompt,
                        system_instruction=system_instruction,
                        generation_config={
                            "temperature": temperature,
                            "max_output_tokens": max_output_tokens,
                        },
                    )

                    output = interaction.output_text

                    if not output:
                        raise RuntimeError(
                            "LLM returned an empty response."
                        )

                    return output.strip()

                if provider == "groq":
                    # ChatGroq is the supported LangChain integration for
                    # Groq-hosted models and keeps provider wiring isolated.
                    from langchain_groq import ChatGroq

                    llm = ChatGroq(
                        model=model,
                        temperature=temperature,
                        api_key=api_key,
                        max_tokens=max_output_tokens,
                    )
                    response = await llm.ainvoke(prompt)
                    content = response.content
                    return content if isinstance(content, str) else str(content)

            except Exception as exc:
                last_error = exc

                logger.warning(
                    "LLM request failed. Attempt %s/%s: %s",
                    attempt + 1,
                    retries + 1,
                    exc,
                )

                if attempt < retries:
                    await asyncio.sleep(2**attempt)

        raise RuntimeError(
            "LLM request failed after all retry attempts."
        ) from last_error

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[T],
        *,
        system_instruction: str | None = None,
        temperature: float = 0.2,
        max_output_tokens: int = 4096,
        retries: int = 2,
    ) -> T:
        """
        Generate a structured response validated by Pydantic.

        Gemini receives the Pydantic-generated JSON schema.
        The returned JSON is then validated again locally.
        """

        last_error: Exception | None = None

        schema = response_model.model_json_schema()

        for attempt in range(retries + 1):
            try:
                provider, model, api_key = get_llm_config()

                if provider == LLMProvider.GEMINI.value:

                    client = genai.Client(api_key=api_key)
                    interaction = (
                        await client.aio.interactions.create(
                            model=model,
                            input=prompt,
                            system_instruction=system_instruction,
                            response_format={
                                "type": "text",
                                "mime_type": "application/json",
                                "schema": schema,
                            },
                            generation_config={
                                "temperature": temperature,
                                "max_output_tokens": max_output_tokens,
                            },
                        )
                    )

                    raw_output = interaction.output_text

                    if not raw_output:
                        raise RuntimeError(
                            "LLM returned an empty structured response."
                        )

                    return response_model.model_validate_json(
                        raw_output
                    )

                if provider == "groq":
                    from langchain_groq import ChatGroq

                    llm = ChatGroq(
                        model=model,
                        temperature=temperature,
                        api_key=api_key,
                        max_tokens=max_output_tokens,
                    )
                    structured_llm = llm.with_structured_output(
                        response_model,
                        method="json_mode",
                    )
                    result = await structured_llm.ainvoke(prompt)
                    return result if isinstance(result, response_model) else response_model.model_validate(result)

            except Exception as exc:
                last_error = exc

                logger.warning(
                    "Structured LLM request failed. Attempt %s/%s: %s",
                    attempt + 1,
                    retries + 1,
                    exc,
                )

                if attempt < retries:
                    await asyncio.sleep(2**attempt)

        raise RuntimeError(
            "Structured LLM request failed after all retry attempts."
        ) from last_error

    async def close(self) -> None:
        """
        No shared client is retained; each request owns its LLM client.
        """

        return None


# Shared application-level service instance.
llm_service = LLMService()
