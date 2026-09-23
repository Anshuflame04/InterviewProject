from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.security import get_current_user_id
from app.services.resume_service import resume_service


router = APIRouter(
    prefix="/resumes",
    tags=["Resumes"],
)


@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """
    Upload, parse, and save a resume.
    """

    try:
        resume = await resume_service.process_and_save_resume(
            user_id=user_id,
            file=file,
        )

        return resume

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process resume.",
        ) from exc


@router.get("/{resume_id}")
async def get_resume(
    resume_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """
    Retrieve one resume belonging to the authenticated user.
    """

    resume = resume_service.get_resume(
        user_id=user_id,
        resume_id=resume_id,
    )

    if resume is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    return resume


@router.get("")
async def list_resumes(
    user_id: str = Depends(get_current_user_id),
):
    """
    List resumes belonging to the authenticated user.
    """

    collection = resume_service.get_resume_collection(
        user_id
    )

    documents = collection.stream()

    resumes = []

    for document in documents:
        data = document.to_dict() or {}

        resumes.append(
            {
                "resume_id": document.id,
                "filename": data.get(
                    "filename",
                    "resume",
                ),
                "created_at": data.get(
                    "created_at"
                ),
            }
        )

    return {
        "resumes": resumes
    }