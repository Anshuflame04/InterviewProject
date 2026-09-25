from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.services.llm_service import llm_service

from app.routers import (
    analytics,
    auth,
    evaluation,
    interviews,
    questions,
    resumes,
)

setup_logging()


# ============================================================
# Logging
# ============================================================

setup_logging()

logger = logging.getLogger(__name__)


# ============================================================
# Application lifecycle
# ============================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage resources that should live for the lifetime
    of the FastAPI application.
    """

    print(
        f"Starting {settings.app_name} "
        f"v{settings.app_version}"
    )

    logger.info(
        "Starting %s v%s",
        settings.app_name,
        settings.app_version,
    )

    logger.info(
        "Environment: %s",
        settings.environment,
    )

    try:
        yield

    finally:
        # Close asynchronous LLM client cleanly.
        await llm_service.close()

        logger.info(
            "Application shutdown completed."
        )


# ============================================================
# FastAPI application
# ============================================================


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Adaptive InterviewYou platform using FastAPI, "
        "Firebase, Firestore, LangGraph and configurable LLMs."
    ),
    debug=settings.debug,
    lifespan=lifespan,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Routers
# ============================================================

app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(interviews.router)
app.include_router(questions.router)
app.include_router(evaluation.router)
app.include_router(analytics.router)


# ============================================================
# Health endpoints
# ============================================================


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.get(
    "/health",
    tags=["Health"],
)

@app.get("/health")
async def health():
    return {
        "status": "ok",
    }


# ============================================================
# Local development
# ============================================================


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
