EVALUATION_SCHEMA = {
    "overall_score": 0.0,
    "technical_correctness": {
        "score": 0.0,
        "feedback": "string",
    },
    "relevance": {
        "score": 0.0,
        "feedback": "string",
    },
    "completeness": {
        "score": 0.0,
        "feedback": "string",
    },
    "depth": {
        "score": 0.0,
        "feedback": "string",
    },
    "communication": {
        "score": 0.0,
        "feedback": "string",
    },
    "strengths": ["string"],
    "weaknesses": ["string"],
    "missing_points": ["string"],
    "ideal_answer": "string",
    "follow_up_question": "string or null",
    "should_increase_difficulty": False,
    "should_decrease_difficulty": False,
    "recommended_next_topic": "string or null",
}


def build_answer_evaluation_prompt(
    question: str,
    expected_points: list[str],
    answer: str,
    resume_context: str = "",
) -> str:
    """
    Evaluate a candidate's answer across multiple dimensions.

    The evaluator should judge the answer itself rather than
    rewarding the candidate simply because a keyword appears.
    """

    expected = "\n".join(
        f"- {point}" for point in expected_points
    ) or "- No specific points provided."

    return f"""
You are an experienced technical interviewer.

Evaluate the candidate's answer to the interview question.

QUESTION:
{question}

EXPECTED POINTS:
{expected}

CANDIDATE ANSWER:
{answer}

CANDIDATE RESUME CONTEXT:
{resume_context or "Not provided"}

Evaluate the answer using these dimensions:

1. Technical correctness
   - Are the concepts technically correct?
   - Identify factual or conceptual mistakes.

2. Relevance
   - Does the answer directly address the question?
   - Penalize unnecessary or unrelated content.

3. Completeness
   - Did the candidate cover the important expected points?

4. Depth
   - Does the candidate demonstrate understanding rather than
     simply giving definitions?
   - Consider examples, trade-offs, implementation details,
     and reasoning where appropriate.

5. Communication
   - Is the answer clear, structured, and understandable?
   - Do not judge grammar harshly unless it affects clarity.

SCORING:

Use a 0-10 scale for every dimension.

0-2  = Very poor
3-4  = Poor
5-6  = Average
7-8  = Good
9    = Very strong
10   = Exceptional

CALIBRATION:

- Start at 5 for an answer that is relevant and basically correct, even if it
  is brief or imperfect.
- Use 6-7 for a clear answer that covers most important points; reserve below
  5 for answers that are mostly incorrect, off-topic, or lack a usable answer.
- Use 8-9 for strong, accurate answers with explanation or a useful example.
- Calculate `overall_score` as a fair summary of the five dimension scores;
  do not make it harsher than the dimensions without a specific reason.

IMPORTANT:

- Do not invent information about the candidate.
- Do not give credit for concepts that were not actually explained.
- Do not penalize an answer for not mentioning something that is
  irrelevant to the question.
- Distinguish between a minor omission and a major conceptual gap.
- `ideal_answer` is mandatory: write a complete, interview-quality model
  answer for this exact question. Include reasoning, important trade-offs,
  implementation detail, and a concrete example where appropriate. Use at
  least 5-8 substantive sentences for technical questions; use more when the
  question needs it. Do not shorten an explanation merely to be brief.
- Suggest a follow-up question only when additional probing would
  meaningfully evaluate the candidate.
- Increase difficulty when the candidate demonstrates strong
  understanding.
- Decrease difficulty when the candidate demonstrates significant
  conceptual weakness.
- Return valid JSON only.

RETURN FORMAT:

{EVALUATION_SCHEMA}
"""
