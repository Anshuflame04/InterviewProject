from app.schemas.evaluation import (
    AnswerEvaluation,
    EvaluationDimension,
)
from app.schemas.question import QuestionDifficulty
from app.services.question_service import QuestionService


def make_evaluation(
    score: float,
    increase: bool = False,
    decrease: bool = False,
) -> AnswerEvaluation:

    dimension = EvaluationDimension(
        score=score,
        feedback="Test feedback",
    )

    return AnswerEvaluation(
        overall_score=score,
        technical_correctness=dimension,
        relevance=dimension,
        completeness=dimension,
        depth=dimension,
        communication=dimension,
        should_increase_difficulty=increase,
        should_decrease_difficulty=decrease,
    )


def test_difficulty_increases_after_strong_answer():

    evaluation = make_evaluation(
        score=9.0
    )

    result = QuestionService.choose_next_difficulty(
        current=QuestionDifficulty.MEDIUM,
        evaluation=evaluation,
    )

    assert result == QuestionDifficulty.HARD


def test_difficulty_decreases_after_weak_answer():

    evaluation = make_evaluation(
        score=4.0
    )

    result = QuestionService.choose_next_difficulty(
        current=QuestionDifficulty.MEDIUM,
        evaluation=evaluation,
    )

    assert result == QuestionDifficulty.EASY


def test_difficulty_stays_same_for_average_answer():

    evaluation = make_evaluation(
        score=7.0
    )

    result = QuestionService.choose_next_difficulty(
        current=QuestionDifficulty.MEDIUM,
        evaluation=evaluation,
    )

    assert result == QuestionDifficulty.MEDIUM