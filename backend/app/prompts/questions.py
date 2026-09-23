from app.schemas.question import (
    QuestionDifficulty,
    QuestionType,
    QuestionSource,
)


# Schema for ONE question.
# Used when the adaptive graph generates the next question.
QUESTION_OBJECT_SCHEMA = {
    "question_id": "string",
    "question": "string",
    "type": "technical | behavioral | follow_up | coding | system_design",
    "difficulty": "easy | medium | hard",
    "topic": "string",
    "skill": "string or null",
    "source": "resume | job_description | previous_answer | general",
    "is_follow_up": False,
    "parent_question_id": "string or null",
    "expected_points": ["string"],
}


# Schema for MULTIPLE questions.
# Used when we want to generate an initial batch.
QUESTION_LIST_SCHEMA = {
    "questions": [
        QUESTION_OBJECT_SCHEMA
    ]
}


def build_initial_questions_prompt(
    resume_context: str,
    job_description: str,
    mode: str,
    difficulty: QuestionDifficulty,
    num_questions: int,
) -> str:
    """
    Generate the initial set of interview questions.

    Questions should be grounded primarily in the candidate's
    resume and the supplied job description.
    """

    return f"""
You are an expert technical interviewer.

Generate {num_questions} interview questions for the candidate.

INTERVIEW MODE:
{mode}

TARGET DIFFICULTY:
{difficulty.value}

JOB DESCRIPTION:
{job_description or "Not provided"}

CANDIDATE RESUME:
{resume_context}

REQUIREMENTS:

1. Questions must be relevant to the candidate's actual resume.
2. Prefer skills and technologies mentioned in the resume.
3. Use the job description to identify important role requirements.
4. Do not invent experience that is not present in the resume.
5. Questions should test understanding, not just memorization.
6. Avoid duplicate questions.
7. Difficulty should match the requested level.
8. Behavioral questions should be used when the mode requires them.
9. Coding questions should be used only when the mode requires them.
10. System-design questions should be used only when appropriate.
11. For every question, provide expected_points containing the
    important concepts a strong candidate should discuss.
12. Return valid JSON only.

QUESTION OBJECT:

{QUESTION_OBJECT_SCHEMA}

RETURN FORMAT:

{QUESTION_LIST_SCHEMA}
"""


def build_adaptive_question_prompt(
    resume_context: str,
    job_description: str,
    mode: str,
    difficulty: QuestionDifficulty,
    previous_question: str,
    previous_answer: str,
    evaluation: dict,
    covered_topics: list[str],
    weak_topics: list[str],
) -> str:
    """
    Generate the next question based on the candidate's
    previous performance.
    """

    covered = ", ".join(covered_topics) if covered_topics else "None"
    weak = ", ".join(weak_topics) if weak_topics else "None"

    return f"""
You are an adaptive AI interviewer.

Your task is to generate EXACTLY ONE next interview question.

INTERVIEW MODE:
{mode}

CURRENT DIFFICULTY:
{difficulty.value}

JOB DESCRIPTION:
{job_description or "Not provided"}

CANDIDATE RESUME:
{resume_context}

PREVIOUS QUESTION:
{previous_question}

CANDIDATE'S ANSWER:
{previous_answer}

PREVIOUS EVALUATION:
{evaluation}

TOPICS ALREADY COVERED:
{covered}

WEAK TOPICS:
{weak}

ADAPTIVE RULES:

1. Do not repeat the previous question.
2. Avoid unnecessarily repeating already-covered topics.
3. If the candidate performed poorly, test the weak concept again
   using a different question.
4. If the candidate performed strongly, increase conceptual depth.
5. A follow-up question should directly relate to the previous answer.
6. If the candidate mentioned an interesting claim or technology,
   a follow-up may ask them to explain it in greater depth.
7. Prefer resume and job-description relevance.
8. Do not invent candidate experience.
9. Respect the current interview mode.
10. Keep the question realistic for a human technical interviewer.
11. Provide expected_points for evaluating the answer.
12. Return ONE question as valid JSON only.

QUESTION OBJECT:

{QUESTION_OBJECT_SCHEMA}
"""


def build_follow_up_question_prompt(
    previous_question: str,
    previous_answer: str,
    evaluation: dict,
) -> str:
    """
    Generate a focused follow-up question.

    This is useful when the candidate's answer contains:
    - an unclear claim
    - an incomplete explanation
    - an interesting technical detail
    - a concept that needs deeper probing
    """

    return f"""
You are conducting a technical interview.

Generate ONE concise follow-up question.

PREVIOUS QUESTION:
{previous_question}

CANDIDATE ANSWER:
{previous_answer}

EVALUATION:
{evaluation}

RULES:

1. The follow-up must directly relate to the candidate's answer.
2. Do not repeat the original question.
3. Probe one specific concept deeper.
4. Do not introduce unrelated topics.
5. Do not assume experience that the candidate did not mention.
6. The question should be answerable verbally in an interview.
7. Return valid JSON only.

QUESTION OBJECT:

{QUESTION_OBJECT_SCHEMA}
"""


__all__ = [
    "QUESTION_OBJECT_SCHEMA",
    "QUESTION_LIST_SCHEMA",
    "build_initial_questions_prompt",
    "build_adaptive_question_prompt",
    "build_follow_up_question_prompt",
]