from app.db.firestore import (
    get_user_interviews_collection,
)
from app.schemas.interview import (
    InterviewStatus,
)


class AnalyticsService:
    """
    Provides interview history and high-level analytics.

    Analytics are always calculated within the authenticated
    user's Firestore collection.
    """

    def get_interview_history(
        self,
        user_id: str,
        limit: int = 5,
        offset: int = 0,
    ) -> list[dict]:
        """
        Return the user's recent interviews.
        """

        query = (
            get_user_interviews_collection(user_id)
            .order_by(
                "created_at",
                direction="DESCENDING",
            )
            .limit(limit)
        )
        if offset:
            query = query.offset(offset)

        documents = query.stream()

        history = []

        for document in documents:
            data = document.to_dict() or {}

            history.append(
                {
                    "interview_id": document.id,
                    "resume_id": data.get("resume_id"),
                    "mode": data.get("mode"),
                    "difficulty": data.get("difficulty"),
                    "status": data.get("status"),
                    "total_questions": data.get(
                        "total_questions",
                        0,
                    ),
                    "current_question_index": data.get(
                        "current_question_index",
                        0,
                    ),
                    "overall_score": data.get("overall_score"),
                    "weak_topics": data.get("weak_topics", []),
                    "weaknesses": data.get("weaknesses", []),
                    "recommendations": data.get("recommendations", []),
                    "created_at": data.get(
                        "created_at"
                    ),
                    "updated_at": data.get(
                        "updated_at"
                    ),
                }
            )

        return history

    def get_overview(
        self,
        user_id: str,
    ) -> dict:
        """
        Calculate basic interview statistics.
        """

        documents = (
            get_user_interviews_collection(user_id)
            .order_by("created_at", direction="DESCENDING")
            .stream()
        )

        total = 0
        completed = 0
        scores: list[float] = []
        weak_topics: list[str] = []
        recommendations: list[str] = []

        for document in documents:
            total += 1

            data = document.to_dict() or {}

            status = data.get("status")

            if status == InterviewStatus.COMPLETED.value:
                completed += 1

            score = data.get("overall_score")

            if score is not None:
                scores.append(float(score))
            weak_topics.extend(data.get("weak_topics", []))
            weak_topics.extend(data.get("weaknesses", []))
            recommendations.extend(data.get("recommendations", []))

        average_score = (
            round(sum(scores) / len(scores), 2)
            if scores
            else 0.0
        )

        return {
            "total_interviews": total,
            "completed_interviews": completed,
            "average_score": average_score,
            "best_score": round(max(scores), 2) if scores else None,
            "weak_topics": list(dict.fromkeys(topic for topic in weak_topics if topic))[:6],
            "recommendations": list(dict.fromkeys(item for item in recommendations if item))[:4],
        }


analytics_service = AnalyticsService()
