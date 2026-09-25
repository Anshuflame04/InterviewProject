BEHAVIORAL_SCHEMA = {
    "overall_score": 0.0,
    "situation_score": {
        "score": 0.0,
        "feedback": "string",
    },
    "task_score": {
        "score": 0.0,
        "feedback": "string",
    },
    "action_score": {
        "score": 0.0,
        "feedback": "string",
    },
    "result_score": {
        "score": 0.0,
        "feedback": "string",
    },
    "star_complete": False,
    "strengths": ["string"],
    "weaknesses": ["string"],
    "feedback": "string",
    "ideal_answer": "string or null",
}


def build_behavioral_evaluation_prompt(
    question: str,
    answer: str,
) -> str:
    """
    Evaluate a behavioral interview answer using the STAR framework.
    """

    return f"""
You are an experienced behavioral interviewer.

Evaluate the candidate's answer using the STAR framework.

QUESTION:
{question}

CANDIDATE ANSWER:
{answer}

Evaluate:

SITUATION
- Did the candidate clearly explain the context?

TASK
- Did they explain their responsibility or objective?

ACTION
- Did they clearly describe what THEY personally did?
- Give more weight to concrete actions than vague statements.

RESULT
- Did they explain the outcome?
- Prefer measurable or specific results when available.

SCORING:

Use 0-10 for every dimension.

0-2  = Very poor
3-4  = Poor
5-6  = Average
7-8  = Good
9    = Very strong
10   = Exceptional

CALIBRATION:

- A relevant, understandable answer with some STAR information starts around
  5, even if it is informal or does not label STAR sections.
- Reserve 0-4 for off-topic, unusable, or substantially incomplete answers.
- Use 6-7 when most of the story and the candidate's contribution are clear;
  use 8-9 for strong, specific actions and outcomes.
- Make `overall_score` a fair average of the four dimension scores.

IMPORTANT:

- Do not invent details that the candidate did not provide.
- Do not assume a positive result without evidence.
- Do not require the candidate to explicitly say the words
  "Situation", "Task", "Action", or "Result".
- Judge whether the underlying information is present.
- Focus on the candidate's own actions.
- Keep feedback specific and actionable.
- `ideal_answer` is mandatory: provide a complete five-to-eight sentence
  model answer to this exact question using a clear STAR structure. Include
  the situation, the candidate's personal action, and a realistic result;
  do not make it short merely for brevity.
- Return valid JSON only.

RETURN FORMAT:

{BEHAVIORAL_SCHEMA}
"""
