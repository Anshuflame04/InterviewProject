from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.db.firestore import get_user_reference


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.get("/me")
async def get_current_user_profile(
    user: dict = Depends(get_current_user),
):
    """
    Return the authenticated Firebase user's profile.

    The UID comes from the verified Firebase ID token.
    """

    user_id = user["uid"]

    user_ref = get_user_reference(user_id)

    document = user_ref.get()

    if not document.exists:
        user_ref.set(
            {
                "uid": user_id,
                "email": user.get("email"),
                "name": user.get("name"),
                "created_at": user.get(
                    "auth_time"
                ),
            }
        )

    return {
        "uid": user_id,
        "email": user.get("email"),
        "name": user.get("name"),
    }