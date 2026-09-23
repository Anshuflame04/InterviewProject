from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user_id
from app.db.firestore import get_user_interviews_collection
from app.schemas.question import Question


router = APIRouter(
    prefix="/questions",
    tags=["Questions"],
)


@router.get("/{interview_id}/current")
async def get_current_question(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Return the currently active question.
    """

    document = (
        get_user_interviews_collection(user_id)
        .document(interview_id)
        .get()
    )

    if not document.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found.",
        )

    data = document.to_dict() or {}

    question = data.get("current_question")

    if not question:
        return {
            "question": None,
            "status": data.get("status"),
        }

    return {
        "question": Question.model_validate(question),
        "status": data.get("status"),
        "question_index": data.get(
            "current_question_index",
            0,
        ),
        "total_questions": data.get(
            "total_questions",
            0,
        ),
    }


@router.get("/{interview_id}/history")
async def get_question_history(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Return previously answered questions and evaluations.
    """

    document = (
        get_user_interviews_collection(user_id)
        .document(interview_id)
        .get()
    )

    if not document.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found.",
        )

    data = document.to_dict() or {}

    answers = data.get("answers", {})

    history = []

    for question_id, answer_data in answers.items():
        history.append(
            {
                "question_id": question_id,
                "question": answer_data.get("question", ""),
                "topic": answer_data.get("topic", ""),
                "expected_points": answer_data.get("expected_points", []),
                "answer": answer_data.get(
                    "answer",
                    "",
                ),
                "evaluation": answer_data.get(
                    "evaluation",
                    {},
                ),
                "duration_seconds": answer_data.get(
                    "duration_seconds"
                ),
                "order": answer_data.get(
                    "order",
                    0,
                ),
            }
        )

    history.sort(key=lambda item: item.get("order", 0))

    return {
        "interview_id": interview_id,
        "history": history,
    }