from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db.firestore import (
    get_user_interviews_collection,
    get_user_resumes_collection,
)
from app.graph import interview_graph
from app.schemas.interview import (
    InterviewCreateRequest,
    InterviewResponse,
    InterviewStatus,
)
from app.schemas.question import Question
from app.core.security import get_current_user_id
from app.core.llm_context import get_llm_config


router = APIRouter(
    prefix="/interviews",
    tags=["Interviews"],
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@router.post(
    "",
    response_model=InterviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_interview(
    request: InterviewCreateRequest,
    user_id: str = Depends(get_current_user_id),
):
    """
    Create an interview and generate its first question.
    """

    # --------------------------------------------------------------
    # Verify resume ownership
    # --------------------------------------------------------------

    resume_ref = (
        get_user_resumes_collection(user_id)
        .document(request.resume_id)
    )

    resume = resume_ref.get()

    if not resume.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    # --------------------------------------------------------------
    # Create interview document
    # --------------------------------------------------------------

    interview_ref = (
        get_user_interviews_collection(user_id)
        .document()
    )

    now = _utc_now()
    llm_provider, llm_model, _ = get_llm_config()

    interview_ref.set(
        {
            "interview_id": interview_ref.id,
            "user_id": user_id,
            "resume_id": request.resume_id,
            "job_description": request.job_description,
            "mode": request.mode.value,
            "difficulty": request.difficulty.value,
            "llm_provider": llm_provider,
            "llm_model": llm_model,
            "status": InterviewStatus.CREATED.value,
            "total_questions": request.num_questions,
            "current_question_index": 0,
            "current_question": None,
            "answers": {},
            "covered_topics": [],
            "weak_topics": [],
            "created_at": now,
            "updated_at": now,
        }
    )

    # --------------------------------------------------------------
    # Start LangGraph
    # --------------------------------------------------------------

    graph_result = await interview_graph.ainvoke(
        {
            "action": "start",
            "user_id": user_id,
            "interview_id": interview_ref.id,
            "resume_id": request.resume_id,
            "job_description": request.job_description,
            "mode": request.mode,
            "difficulty": request.difficulty,
            "total_questions": request.num_questions,
            "current_question_index": 0,
            "covered_topics": [],
            "weak_topics": [],
        }
    )

    question = graph_result["current_question"]

    # --------------------------------------------------------------
    # Persist graph result
    # --------------------------------------------------------------

    interview_ref.update(
        {
            "status": InterviewStatus.IN_PROGRESS.value,
            "current_question_index": graph_result[
                "current_question_index"
            ],
            "current_question": question.model_dump(
                mode="json"
            ),
            "difficulty": graph_result[
                "difficulty"
            ].value,
            "graph_state": {
                key: (
                    value.model_dump(mode="json")
                    if hasattr(value, "model_dump")
                    else value
                )
                for key, value in graph_result.items()
                if key not in {
                    "user_id",
                    "interview_id",
                }
            },
            "updated_at": _utc_now(),
        }
    )

    return InterviewResponse(
        interview_id=interview_ref.id,
        user_id=user_id,
        resume_id=request.resume_id,
        job_description=request.job_description,
        mode=request.mode,
        difficulty=graph_result["difficulty"],
        llm_provider=llm_provider,
        llm_model=llm_model,
        status=InterviewStatus.IN_PROGRESS,
        total_questions=request.num_questions,
        current_question=question,
        current_question_index=graph_result[
            "current_question_index"
        ],
        created_at=now,
        updated_at=_utc_now(),
    )


@router.get(
    "/{interview_id}",
    response_model=InterviewResponse,
)
async def get_interview(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve an interview belonging to the authenticated user.
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

    current_question = data.get("current_question")

    return InterviewResponse(
        interview_id=document.id,
        user_id=user_id,
        resume_id=data["resume_id"],
        job_description=data.get(
            "job_description",
            "",
        ),
        mode=data["mode"],
        difficulty=data["difficulty"],
        llm_provider=data.get("llm_provider"),
        llm_model=data.get("llm_model"),
        status=data["status"],
        total_questions=data.get(
            "total_questions",
            0,
        ),
        current_question=(
            Question.model_validate(current_question)
            if current_question
            else None
        ),
        current_question_index=data.get(
            "current_question_index",
            0,
        ),
        overall_score=data.get("overall_score"),
        technical_score=data.get("technical_score"),
        communication_score=data.get("communication_score"),
        behavioral_score=data.get("behavioral_score"),
        depth_score=data.get("depth_score"),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        recommendations=data.get("recommendations", []),
        detailed_recommendations=data.get("detailed_recommendations"),
        duration_seconds=data.get("duration_seconds"),
        answers=data.get("answers", {}),
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )


@router.post(
    "/{interview_id}/pause",
)
async def pause_interview(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Pause an interview.
    """

    ref = (
        get_user_interviews_collection(user_id)
        .document(interview_id)
    )

    document = ref.get()

    if not document.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found.",
        )

    ref.update(
        {
            "status": InterviewStatus.PAUSED.value,
            "updated_at": _utc_now(),
        }
    )

    return {
        "message": "Interview paused."
    }


@router.post(
    "/{interview_id}/resume",
)
async def resume_interview(
    interview_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Resume a paused interview.
    """

    ref = (
        get_user_interviews_collection(user_id)
        .document(interview_id)
    )

    document = ref.get()

    if not document.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found.",
        )

    data = document.to_dict() or {}

    if data.get("status") != InterviewStatus.PAUSED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only paused interviews can be resumed.",
        )

    ref.update(
        {
            "status": InterviewStatus.IN_PROGRESS.value,
            "updated_at": _utc_now(),
        }
    )

    return {
        "message": "Interview resumed."
    }
