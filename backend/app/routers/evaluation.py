from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.firestore import get_user_interviews_collection
from app.graph import interview_graph
from app.schemas.evaluation import (
    AnswerEvaluation,
    AnswerSubmitRequest,
    BehavioralEvaluation,
)
from app.schemas.interview import (
    DifficultyLevel,
    InterviewMode,
    InterviewStatus,
)
from app.schemas.question import Question
from app.services.evaluation_service import evaluation_service


router = APIRouter(
    prefix="/evaluation",
    tags=["Evaluation"],
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/answer")
async def submit_answer(
    request: AnswerSubmitRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Submit the current interview answer.

    Flow:

        Answer
          ↓
        LangGraph
          ↓
        Evaluate
          ↓
        Decide difficulty
          ↓
        Generate next question / finish
          ↓
        Firestore
    """

    interview_ref = (
        get_user_interviews_collection(user_id)
        .document(request.interview_id)
    )

    document = interview_ref.get()

    if not document.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found.",
        )

    data = document.to_dict() or {}

    if data.get("status") != InterviewStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview is not currently in progress.",
        )

    current_question_data = data.get("current_question")

    if not current_question_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active question found.",
        )

    current_question = Question.model_validate(
        current_question_data
    )

    # Prevent submitting an answer for an old question.
    if current_question.question_id != request.question_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This question is no longer active.",
        )

    # --------------------------------------------------------------
    # Run adaptive graph
    # --------------------------------------------------------------

    graph_result = await interview_graph.ainvoke(
        {
            "action": "answer",
            "user_id": user_id,
            "interview_id": request.interview_id,
            "resume_id": data["resume_id"],
            "job_description": data.get(
                "job_description",
                "",
            ),
            "mode": InterviewMode(
                data["mode"]
            ),
            "difficulty": DifficultyLevel(
                data["difficulty"]
            ),
            "total_questions": data.get(
                "total_questions",
                1,
            ),
            "current_question_index": data.get(
                "current_question_index",
                1,
            ),
            "current_question": current_question,
            "answer": request.answer,
            "covered_topics": data.get(
                "covered_topics",
                [],
            ),
            "weak_topics": data.get(
                "weak_topics",
                [],
            ),
        }
    )

    evaluation = graph_result["evaluation"]

    # --------------------------------------------------------------
    # Persist answer + evaluation
    # --------------------------------------------------------------

    evaluation_service.save_question_evaluation(
        user_id=user_id,
        interview_id=request.interview_id,
        question_id=request.question_id,
        answer=request.answer,
        evaluation=evaluation,
        duration_seconds=request.duration_seconds,
        question_text=current_question.question,
        topic=current_question.topic or "",
        expected_points=current_question.expected_points or [],
        order=data.get("current_question_index", 0),
    )

    # --------------------------------------------------------------
    # Calculate current interview score
    # --------------------------------------------------------------

    # The session document was already loaded above.  Aggregate its existing
    # answers plus this evaluation locally, avoiding another Firestore read on
    # every answer submission.
    answers_for_score = dict(data.get("answers", {}))
    answers_for_score[request.question_id] = {
        "evaluation": evaluation.model_dump(mode="json"),
    }
    score = evaluation_service.aggregate_answers(answers_for_score)

    should_continue = graph_result.get(
        "should_continue",
        False,
    )

    next_question = graph_result.get(
        "next_question"
    )

    if should_continue and next_question:
        new_status = InterviewStatus.IN_PROGRESS

        update_data = {
            "status": new_status.value,
            "difficulty": graph_result[
                "difficulty"
            ].value,
            "current_question_index": graph_result[
                "current_question_index"
            ],
            "current_question": next_question.model_dump(
                mode="json"
            ),
            "covered_topics": graph_result.get(
                "covered_topics",
                [],
            ),
            "weak_topics": graph_result.get(
                "weak_topics",
                [],
            ),
            "overall_score": score.overall_score,
            "graph_state": {
                key: (
                    value.model_dump(mode="json")
                    if hasattr(value, "model_dump")
                    else value
                )
                for key, value in graph_result.items()
                if key not in {
                    "answer",
                    "evaluation",
                }
            },
            "updated_at": _utc_now(),
        }

    else:
        new_status = InterviewStatus.COMPLETED

        final_answers = dict(data.get("answers", {}))
        final_answers[request.question_id] = {
            "question": current_question.question,
            "answer": request.answer,
            "evaluation": evaluation.model_dump(mode="json"),
        }
        detailed_recommendations = await evaluation_service.generate_final_recommendations(
            user_id=user_id,
            resume_id=data["resume_id"],
            answers=final_answers,
        )

        update_data = {
            "status": new_status.value,
            "overall_score": score.overall_score,
            "technical_score": score.technical_score,
            "communication_score": score.communication_score,
            "behavioral_score": score.behavioral_score,
            "depth_score": score.depth_score,
            "strengths": score.strengths,
            "weaknesses": score.weaknesses,
            "recommendations": score.recommendations,
            "detailed_recommendations": detailed_recommendations.model_dump(mode="json"),
            "current_question": None,
            "graph_state": {
                "status": "completed",
            },
            "updated_at": _utc_now(),
        }

        if request.duration_seconds:
            update_data["duration_seconds"] = request.duration_seconds

    interview_ref.update(update_data)

    return {
        "interview_id": request.interview_id,
        "question_id": request.question_id,
        "evaluation": evaluation,
        "score": score,
        "next_question": next_question,
        # The client uses this flag to decide whether the primary action is
        # "Next Question" or the final submission.  Returning it explicitly
        # prevents a valid next question from being treated as a completed
        # interview.
        "should_continue": should_continue,
        "current_question_index": update_data.get(
            "current_question_index",
            data.get("current_question_index", 0),
        ),
        "status": new_status,
    }
