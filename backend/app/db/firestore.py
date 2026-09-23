import json
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore

from app.core.config import settings


@lru_cache
def get_firebase_app():
    """
    Initialize Firebase exactly once.

    Local development:
        Uses firebase_service_account_path.

    Production:
        Uses firebase_service_account_json from environment variables.
    """

    try:
        return firebase_admin.get_app()

    except ValueError:

        # Production: Firebase credentials provided as JSON
        if settings.firebase_service_account_json:
            service_account_info = json.loads(
                settings.firebase_service_account_json
            )

            credential = credentials.Certificate(
                service_account_info
            )

        # Local development: Firebase credentials provided as a file
        elif settings.firebase_service_account_path:
            credential = credentials.Certificate(
                settings.firebase_service_account_path
            )

        else:
            raise RuntimeError(
                "Firebase credentials are not configured. "
                "Set FIREBASE_SERVICE_ACCOUNT_JSON or "
                "FIREBASE_SERVICE_ACCOUNT_PATH."
            )

        return firebase_admin.initialize_app(credential)


@lru_cache
def get_firestore_client():
    """
    Return the shared Firestore client.
    """

    get_firebase_app()

    return firestore.client()


def get_user_reference(user_id: str):
    return (
        get_firestore_client()
        .collection("users")
        .document(user_id)
    )


def get_user_resumes_collection(user_id: str):
    return get_user_reference(user_id).collection(
        "resumes"
    )


def get_user_interviews_collection(user_id: str):
    return get_user_reference(user_id).collection(
        "interviews"
    )


def get_user_analytics_collection(user_id: str):
    return get_user_reference(user_id).collection(
        "analytics"
    )