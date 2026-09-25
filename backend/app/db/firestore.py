from functools import lru_cache
import json

import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import settings


@lru_cache
def get_firebase_app():
    """
    Initialize Firebase exactly once.

    Supports two credential sources:

    1. FIREBASE_SERVICE_ACCOUNT_JSON
       - Used for production deployments such as Render.
       - Contains the complete Firebase service-account JSON.

    2. FIREBASE_SERVICE_ACCOUNT_PATH
       - Used for local development.
       - Points to a local Firebase service-account JSON file.
    """

    # Return the existing Firebase app if it has already been initialized.
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    # ---------------------------------------------------------
    # Production: Firebase service-account JSON from environment
    # ---------------------------------------------------------
    if settings.firebase_service_account_json:
        try:
            service_account_info = json.loads(
                settings.firebase_service_account_json
            )

            credential = credentials.Certificate(
                service_account_info
            )

        except json.JSONDecodeError as exc:
            raise RuntimeError(
                "FIREBASE_SERVICE_ACCOUNT_JSON contains invalid JSON."
            ) from exc

        except Exception as exc:
            raise RuntimeError(
                "Failed to load Firebase service-account JSON."
            ) from exc

    # ---------------------------------------------------------
    # Local development: Firebase service-account file
    # ---------------------------------------------------------
    elif settings.firebase_service_account_path:
        credential = credentials.Certificate(
            settings.firebase_service_account_path
        )

    # ---------------------------------------------------------
    # No credentials configured
    # ---------------------------------------------------------
    else:
        raise RuntimeError(
            "Firebase service-account credentials are not configured. "
            "Set FIREBASE_SERVICE_ACCOUNT_JSON or "
            "FIREBASE_SERVICE_ACCOUNT_PATH."
        )

    # Initialize and return the Firebase application.
    return firebase_admin.initialize_app(credential)


@lru_cache
def get_firestore_client():
    """
    Return the shared Firestore client.
    """

    # Ensure Firebase Admin has been initialized.
    get_firebase_app()

    return firestore.client()


def get_user_reference(user_id: str):
    """
    Return the Firestore document reference for a specific user.

    Path:
        users/{user_id}
    """

    return (
        get_firestore_client()
        .collection("users")
        .document(user_id)
    )


def get_user_resumes_collection(user_id: str):
    """
    Return the resumes collection for a specific user.

    Path:
        users/{user_id}/resumes
    """

    return get_user_reference(user_id).collection("resumes")


def get_user_interviews_collection(user_id: str):
    """
    Return the interviews collection for a specific user.

    Path:
        users/{user_id}/interviews
    """

    return get_user_reference(user_id).collection("interviews")


def get_user_analytics_collection(user_id: str):
    """
    Return the analytics collection for a specific user.

    Path:
        users/{user_id}/analytics
    """

    return get_user_reference(user_id).collection("analytics")