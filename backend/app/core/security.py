from typing import Any, Dict

from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from app.db.firestore import get_firebase_app
from app.core.llm_context import set_llm_config


# Reads:
# Authorization: Bearer <firebase-id-token>
bearer_scheme = HTTPBearer(auto_error=False)


def verify_firebase_token(
    credentials: HTTPAuthorizationCredentials | None,
) -> Dict[str, Any]:
    """
    Verify a Firebase ID token and return the decoded claims.
    """

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is required.",
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme.",
        )

    try:
        # Ensure Firebase is initialized.
        get_firebase_app()

        decoded_token = auth.verify_id_token(
            credentials.credentials,
            check_revoked=True,
        )

        return decoded_token

    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
        )

    except auth.RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has been revoked.",
        )

    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
) -> Dict[str, Any]:
    """
    FastAPI dependency used by protected routes.

    Example:

        @router.get("/profile")
        async def profile(user=Depends(get_current_user)):
            ...
    """

    return verify_firebase_token(credentials)


async def get_current_user_id(
    user: Dict[str, Any] = Depends(get_current_user),
    llm_provider: str | None = Header(default=None, alias="X-LLM-Provider"),
    llm_model: str | None = Header(default=None, alias="X-LLM-Model"),
    llm_api_key: str | None = Header(default=None, alias="X-LLM-API-Key"),
) -> str:
    """
    Convenience dependency that returns only the Firebase UID.
    """

    uid = user.get("uid")

    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user ID is missing.",
        )

    set_llm_config(llm_provider, llm_model, llm_api_key)

    return uid
