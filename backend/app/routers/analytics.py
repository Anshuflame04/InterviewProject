from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user_id
from app.services.analytics_service import analytics_service


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get("/overview")
async def get_analytics_overview(
    user_id: str = Depends(get_current_user_id),
):
    """
    Return high-level interview statistics.
    """

    return analytics_service.get_overview(
        user_id=user_id
    )


@router.get("/history")
async def get_interview_history(
    limit: int = Query(default=5, ge=1, le=5),
    offset: int = Query(default=0, ge=0),
    user_id: str = Depends(get_current_user_id),
):
    """
    Return the authenticated user's interview history.
    """

    interviews = analytics_service.get_interview_history(
        user_id=user_id,
        limit=limit,
        offset=offset,
    )
    return {
        "interviews": interviews,
        "has_more": len(interviews) == limit,
    }
