import logging
import uuid

from app.db.firestore import get_user_resumes_collection
from app.prompts.questions import (
    build_adaptive_question_prompt,
    build_initial_questions_prompt,
)
from app.schemas.evaluation import AnswerEvaluation
from app.schemas.question import (
    Question,
    QuestionDifficulty,
    QuestionGenerateResponse,
)
from app.services.llm_service import llm_service


logger = logging.getLogger(__name__)


class QuestionService:
    """
    Generates interview questions using resume context,
    job requirements, and previous performance.
    """

    def _get_resume_context(
        self,
        user_id: str,
        resume_id: str,
    ) -> str:
        """
        Retrieve structured resume data for the authenticated user.
        """

        document = (
            get_user_resumes_collection(user_id)
            .document(resume_id)
            .get()
        )

        if not document.exists:
            raise ValueError("Resume not found.")

        data = document.to_dict() or {}

        resume_data = data.get("data")

        if not resume_data:
            raise ValueError(
                "Resume does not contain structured data."
            )

        # Keep the context readable for the LLM.
        return str(resume_data)[:6000]

    async def generate_initial_questions(
        self,
        user_id: str,
        resume_id: str,
        job_description: str,
        mode: str,
        difficulty: QuestionDifficulty,
        num_questions: int,
    ) -> QuestionGenerateResponse:
        """
        Generate the initial batch of questions.
        """

        resume_context = self._get_resume_context(
            user_id=user_id,
            resume_id=resume_id,
        )

        prompt = build_initial_questions_prompt(
            resume_context=resume_context,
            job_description=job_description,
            mode=mode,
            difficulty=difficulty,
            num_questions=num_questions,
        )

        result = await llm_service.generate_structured(
            prompt=prompt,
            response_model=QuestionGenerateResponse,
            temperature=0.4,
        )

        return result

    async def generate_next_question(
        self,
        user_id: str,
        resume_id: str,
        job_description: str,
        mode: str,
        difficulty: QuestionDifficulty,
        previous_question: Question,
        previous_answer: str,
        evaluation: AnswerEvaluation,
        covered_topics: list[str],
        weak_topics: list[str],
    ) -> Question:
        """
        Generate one adaptive question based on the candidate's
        previous answer.
        """

        resume_context = self._get_resume_context(
            user_id=user_id,
            resume_id=resume_id,
        )

        prompt = build_adaptive_question_prompt(
            resume_context=resume_context,
            job_description=job_description,
            mode=mode,
            difficulty=difficulty,
            previous_question=previous_question.question,
            previous_answer=previous_answer,
            evaluation=evaluation.model_dump(),
            covered_topics=covered_topics,
            weak_topics=weak_topics,
        )

        question = await llm_service.generate_structured(
            prompt=prompt,
            response_model=Question,
            temperature=0.4,
            max_output_tokens=900,
            retries=1,
        )

        # Ensure every generated question has a unique ID.
        if not question.question_id:
            question.question_id = uuid.uuid4().hex

        return question

    @staticmethod
    def choose_next_difficulty(
        current: QuestionDifficulty,
        evaluation: AnswerEvaluation,
    ) -> QuestionDifficulty:
        """
        Adapt interview difficulty based on both the evaluator's
        recommendation and the candidate's actual score.

        Score policy:
            0-4  -> decrease
            5-7  -> maintain
            8-10 -> increase

        Explicit evaluator recommendations take precedence.
        """

        # Explicit LLM recommendation
        if evaluation.should_increase_difficulty:
            return QuestionService._increase_difficulty(
                current
            )

        if evaluation.should_decrease_difficulty:
            return QuestionService._decrease_difficulty(
                current
            )

        # Score-based fallback
        if evaluation.overall_score >= 8:
            return QuestionService._increase_difficulty(
                current
            )

        if evaluation.overall_score <= 4:
            return QuestionService._decrease_difficulty(
                current
            )

        return current

    @staticmethod
    def _increase_difficulty(
        difficulty: QuestionDifficulty,
    ) -> QuestionDifficulty:

        if difficulty == QuestionDifficulty.EASY:
            return QuestionDifficulty.MEDIUM

        if difficulty == QuestionDifficulty.MEDIUM:
            return QuestionDifficulty.HARD

        return QuestionDifficulty.HARD

    @staticmethod
    def _decrease_difficulty(
        difficulty: QuestionDifficulty,
    ) -> QuestionDifficulty:

        if difficulty == QuestionDifficulty.HARD:
            return QuestionDifficulty.MEDIUM

        if difficulty == QuestionDifficulty.MEDIUM:
            return QuestionDifficulty.EASY

        return QuestionDifficulty.EASY


question_service = QuestionService()
