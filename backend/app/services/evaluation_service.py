import logging

from app.db.firestore import (
    get_user_interviews_collection,
    get_user_resumes_collection,
)
from app.prompts.behavioral import (
    build_behavioral_evaluation_prompt,
)
from app.prompts.evaluation import (
    build_answer_evaluation_prompt,
)
from app.schemas.evaluation import (
    AnswerEvaluation,
    BehavioralEvaluation,
    InterviewScore,
    FinalRecommendations,
)
from app.schemas.question import Question
from app.services.llm_service import llm_service


logger = logging.getLogger(__name__)


class EvaluationService:
    """
    Evaluates candidate answers and calculates interview-level
    performance metrics.
    """

    def _get_resume_context(
        self,
        user_id: str,
        resume_id: str,
    ) -> str:
        document = (
            get_user_resumes_collection(user_id)
            .document(resume_id)
            .get()
        )

        if not document.exists:
            return ""

        data = document.to_dict() or {}

        # Enough context for personalization without repeatedly sending an
        # entire parsed resume to the model for every answer.
        return str(data.get("data", {}))[:16000]

    async def evaluate_answer(
        self,
        user_id: str,
        resume_id: str,
        question: Question,
        answer: str,
    ) -> AnswerEvaluation:
        """
        Evaluate a technical/general answer.
        """

        resume_context = self._get_resume_context(
            user_id=user_id,
            resume_id=resume_id,
        )

        prompt = build_answer_evaluation_prompt(
            question=question.question,
            expected_points=question.expected_points,
            answer=answer,
            resume_context=resume_context,
        )

        evaluation = await llm_service.generate_structured(
            prompt=prompt,
            response_model=AnswerEvaluation,
            temperature=0.1,
            max_output_tokens=6000,
            retries=1,
        )
        # Keep the displayed rating mathematically consistent with the
        # detailed feedback instead of trusting a separately generated score.
        evaluation.overall_score = self._average([
            evaluation.technical_correctness.score,
            evaluation.relevance.score,
            evaluation.completeness.score,
            evaluation.depth.score,
            evaluation.communication.score,
        ])
        return evaluation

    async def evaluate_behavioral_answer(
        self,
        question: Question,
        answer: str,
    ) -> BehavioralEvaluation:
        """
        Evaluate a behavioral answer using STAR.
        """

        prompt = build_behavioral_evaluation_prompt(
            question=question.question,
            answer=answer,
        )

        evaluation = await llm_service.generate_structured(
            prompt=prompt,
            response_model=BehavioralEvaluation,
            temperature=0.1,
            max_output_tokens=4500,
            retries=1,
        )
        evaluation.overall_score = self._average([
            evaluation.situation_score.score,
            evaluation.task_score.score,
            evaluation.action_score.score,
            evaluation.result_score.score,
        ])
        return evaluation

    async def generate_final_recommendations(
        self,
        user_id: str,
        resume_id: str,
        answers: dict,
    ) -> FinalRecommendations:
        """Generate the concise, report-only coaching summary once per interview."""
        resume_context = self._get_resume_context(user_id, resume_id)
        answer_summary = "\n".join(
            f"Q: {item.get('question', '')}\nA: {item.get('answer', '')}\nFeedback: {item.get('evaluation', {})}"
            for item in answers.values()
        )[:60000]
        prompt = f"""
You are an expert interview coach. Produce a personalized final report.

RESUME:
{resume_context or 'Not available'}

INTERVIEW ANSWERS AND EVALUATIONS:
{answer_summary}

Return JSON with exactly these four fields:
- resume_recommendation: one concrete, constructive paragraph about resume presentation.
- interview_answer_recommendation: one concrete paragraph based on the candidate's actual delivery.
- general_interview_success_tip: one actionable technical/behavioral interview tip.
- encouragement: a warm, specific closing sentence. Do not exaggerate or invent achievements.

Keep every recommendation practical, direct, and personalized. Return JSON only.
"""
        return await llm_service.generate_structured(
            prompt=prompt,
            response_model=FinalRecommendations,
            temperature=0.2,
            max_output_tokens=2400,
            retries=1,
        )

    def save_question_evaluation(
        self,
        user_id: str,
        interview_id: str,
        question_id: str,
        answer: str,
        evaluation: AnswerEvaluation | BehavioralEvaluation,
        duration_seconds: int | None = None,
        question_text: str = "",
        topic: str = "",
        expected_points: list[str] | None = None,
        order: int = 0,
    ) -> None:
        """
        Store an evaluated answer inside the user's interview.
        """

        interview_ref = (
            get_user_interviews_collection(user_id)
            .document(interview_id)
        )

        evaluation_data = evaluation.model_dump(
            mode="json"
        )

        interview_ref.update(
            {
                f"answers.{question_id}": {
                    "question_id": question_id,
                    "question": question_text,
                    "topic": topic,
                    "expected_points": expected_points or [],
                    "answer": answer,
                    "evaluation": evaluation_data,
                    "duration_seconds": duration_seconds,
                    "order": order,
                }
            }
        )

    def aggregate_interview_score(
        self,
        user_id: str,
        interview_id: str,
    ) -> InterviewScore:
        """
        Calculate the current interview score from all
        completed evaluations.
        """

        document = (
            get_user_interviews_collection(user_id)
            .document(interview_id)
            .get()
        )

        if not document.exists:
            raise ValueError("Interview not found.")

        data = document.to_dict() or {}

        return self.aggregate_answers(data.get("answers", {}))

    def aggregate_answers(
        self,
        answers: dict,
    ) -> InterviewScore:
        """Calculate scores from an already-loaded answer map."""

        if not answers:
            return InterviewScore(
                overall_score=0,
                technical_score=0,
                communication_score=0,
                behavioral_score=0,
                depth_score=0,
            )

        overall_scores: list[float] = []
        technical_scores: list[float] = []
        communication_scores: list[float] = []
        depth_scores: list[float] = []
        behavioral_scores: list[float] = []

        strengths: list[str] = []
        weaknesses: list[str] = []
        recommendations: list[str] = []

        for item in answers.values():
            evaluation = item.get(
                "evaluation",
                {},
            )

            overall = evaluation.get(
                "overall_score"
            )

            if overall is not None:
                overall_scores.append(
                    float(overall)
                )

            # Technical correctness
            technical = evaluation.get(
                "technical_correctness"
            )

            if isinstance(technical, dict):
                score = technical.get("score")

                if score is not None:
                    technical_scores.append(
                        float(score)
                    )

            # Communication
            communication = evaluation.get(
                "communication"
            )

            if isinstance(communication, dict):
                score = communication.get("score")

                if score is not None:
                    communication_scores.append(
                        float(score)
                    )

            # Depth
            depth = evaluation.get("depth")

            if isinstance(depth, dict):
                score = depth.get("score")

                if score is not None:
                    depth_scores.append(
                        float(score)
                    )

            # Behavioral STAR evaluation
            star_scores: list[float] = []

            for key in (
                "situation_score",
                "task_score",
                "action_score",
                "result_score",
            ):
                dimension = evaluation.get(key)

                if isinstance(dimension, dict):
                    score = dimension.get("score")

                    if score is not None:
                        star_scores.append(
                            float(score)
                        )

            if star_scores:
                behavioral_scores.append(
                    sum(star_scores)
                    / len(star_scores)
                )

            strengths.extend(
                evaluation.get(
                    "strengths",
                    [],
                )
            )

            weaknesses.extend(
                evaluation.get(
                    "weaknesses",
                    [],
                )
            )

            recommendations.extend(
                evaluation.get(
                    "missing_points",
                    [],
                )
            )

        return InterviewScore(
            overall_score=self._average(
                overall_scores
            ),
            technical_score=self._average(
                technical_scores
            ),
            communication_score=self._average(
                communication_scores
            ),
            behavioral_score=self._average(
                behavioral_scores
            ),
            depth_score=self._average(
                depth_scores
            ),
            strengths=self._unique_items(
                strengths
            ),
            weaknesses=self._unique_items(
                weaknesses
            ),
            recommendations=self._unique_items(
                recommendations
            ),
        )

    @staticmethod
    def _average(
        values: list[float],
    ) -> float:
        if not values:
            return 0.0

        return round(
            sum(values) / len(values),
            2,
        )

    @staticmethod
    def _unique_items(
        values: list[str],
        limit: int = 10,
    ) -> list[str]:
        """
        Remove duplicates while preserving order.
        """

        result: list[str] = []

        for value in values:
            value = str(value).strip()

            if value and value not in result:
                result.append(value)

            if len(result) >= limit:
                break

        return result


evaluation_service = EvaluationService()
