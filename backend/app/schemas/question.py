from enum import Enum

from pydantic import BaseModel, Field


class QuestionType(str, Enum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    FOLLOW_UP = "follow_up"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"


class QuestionDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class QuestionSource(str, Enum):
    RESUME = "resume"
    JOB_DESCRIPTION = "job_description"
    PREVIOUS_ANSWER = "previous_answer"
    GENERAL = "general"


class Question(BaseModel):
    """
    Canonical representation of a single interview question.

    This model is used across:
    - LLM structured output
    - LangGraph state
    - Firestore
    - API responses
    """

    question_id: str = Field(min_length=1)

    question: str = Field(min_length=1)

    type: QuestionType

    difficulty: QuestionDifficulty

    topic: str = Field(min_length=1)

    skill: str | None = None

    source: QuestionSource

    is_follow_up: bool = False

    parent_question_id: str | None = None

    # Points the candidate is expected to cover.
    expected_points: list[str] = Field(default_factory=list)


class QuestionGenerateRequest(BaseModel):
    resume_id: str
    job_description: str = ""
    mode: str
    difficulty: QuestionDifficulty
    num_questions: int = Field(default=1, ge=1, le=20)


class QuestionGenerateResponse(BaseModel):
    questions: list[Question]


class NextQuestionRequest(BaseModel):
    interview_id: str
    previous_question_id: str
    answer: str


class NextQuestionResponse(BaseModel):
    question: Question