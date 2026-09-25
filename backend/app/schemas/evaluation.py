from pydantic import BaseModel, Field


class EvaluationDimension(BaseModel):
    """
    Score for one aspect of an interview answer.
    """

    score: float = Field(ge=0, le=10)

    feedback: str


class AnswerSubmitRequest(BaseModel):
    interview_id: str

    question_id: str

    answer: str = Field(min_length=1)

    # Optional because the frontend may not track timing.
    duration_seconds: int | None = Field(
        default=None,
        ge=0,
    )


class AnswerEvaluation(BaseModel):
    """
    Structured evaluation for a technical/general interview answer.
    """

    overall_score: float = Field(ge=0, le=10)

    technical_correctness: EvaluationDimension

    relevance: EvaluationDimension

    completeness: EvaluationDimension

    depth: EvaluationDimension

    communication: EvaluationDimension

    strengths: list[str] = Field(default_factory=list)

    weaknesses: list[str] = Field(default_factory=list)

    missing_points: list[str] = Field(default_factory=list)

    # A default keeps legacy saved evaluations and lightweight callers valid.
    # Production prompts explicitly require a complete ideal answer.
    ideal_answer: str = Field(
        default="No ideal answer was generated for this evaluation.",
        min_length=20,
    )

    follow_up_question: str | None = None

    should_increase_difficulty: bool = False

    should_decrease_difficulty: bool = False

    recommended_next_topic: str | None = None


class BehavioralEvaluation(BaseModel):
    """
    STAR-based evaluation for behavioral questions.
    """

    overall_score: float = Field(ge=0, le=10)

    situation_score: EvaluationDimension

    task_score: EvaluationDimension

    action_score: EvaluationDimension

    result_score: EvaluationDimension

    star_complete: bool

    strengths: list[str] = Field(default_factory=list)

    weaknesses: list[str] = Field(default_factory=list)

    feedback: str

    ideal_answer: str = Field(
        default="No ideal answer was generated for this evaluation.",
        min_length=20,
    )


class AnswerEvaluationResponse(BaseModel):
    interview_id: str

    question_id: str

    evaluation: AnswerEvaluation | BehavioralEvaluation

    next_question: object | None = None


class InterviewScore(BaseModel):
    """
    Aggregated interview-level performance.
    """

    overall_score: float = Field(ge=0, le=10)

    technical_score: float = Field(ge=0, le=10)

    communication_score: float = Field(ge=0, le=10)

    behavioral_score: float = Field(ge=0, le=10)

    depth_score: float = Field(ge=0, le=10)

    strengths: list[str] = Field(default_factory=list)

    weaknesses: list[str] = Field(default_factory=list)

    recommendations: list[str] = Field(default_factory=list)


class FinalRecommendations(BaseModel):
    resume_recommendation: str = Field(min_length=20)
    interview_answer_recommendation: str = Field(min_length=20)
    general_interview_success_tip: str = Field(min_length=20)
    encouragement: str = Field(min_length=20)
