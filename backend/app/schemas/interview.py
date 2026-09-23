from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.question import Question


class InterviewMode(str, Enum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    MIXED = "mixed"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InterviewStatus(str, Enum):
    CREATED = "created"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class InterviewCreateRequest(BaseModel):
    resume_id: str

    job_description: str = ""

    mode: InterviewMode = InterviewMode.MIXED

    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM

    num_questions: int = Field(
        default=10,
        ge=1,
        le=50,
    )


class InterviewResponse(BaseModel):
    interview_id: str

    user_id: str

    resume_id: str

    job_description: str

    mode: InterviewMode

    difficulty: DifficultyLevel

    llm_provider: str | None = None
    llm_model: str | None = None

    status: InterviewStatus

    total_questions: int

    current_question: Question | None = None

    current_question_index: int = 0

    # Result fields populated after interview completion.
    overall_score: float | None = None
    technical_score: float | None = None
    communication_score: float | None = None
    behavioral_score: float | None = None
    depth_score: float | None = None
    strengths: list[str] = []
    weaknesses: list[str] = []
    recommendations: list[str] = []
    detailed_recommendations: dict | None = None
    duration_seconds: int | None = None
    answers: dict | None = None

    created_at: datetime

    updated_at: datetime


class InterviewState(BaseModel):
    """
    Runtime state used by the adaptive interview engine.

    This is separate from InterviewResponse because the graph
    needs additional internal state that should not necessarily
    be exposed through the API.
    """

    interview_id: str

    user_id: str

    resume_id: str

    job_description: str = ""

    mode: InterviewMode

    difficulty: DifficultyLevel

    status: InterviewStatus

    current_question_index: int = 0

    total_questions: int

    current_question: Question | None = None

    previous_questions: list[Question] = Field(
        default_factory=list
    )

    answered_questions: list[str] = Field(
        default_factory=list
    )

    strengths: list[str] = Field(
        default_factory=list
    )

    weaknesses: list[str] = Field(
        default_factory=list
    )

    covered_topics: list[str] = Field(
        default_factory=list
    )

    weak_topics: list[str] = Field(
        default_factory=list
    )

    current_score: float = 0.0

    should_continue: bool = True

    started_at: datetime | None = None
