from typing import Literal, TypedDict

from langgraph.graph import END, START, StateGraph

from app.schemas.evaluation import (
    AnswerEvaluation,
    BehavioralEvaluation,
)
from app.schemas.interview import (
    DifficultyLevel,
    InterviewMode,
)
from app.schemas.question import Question, QuestionDifficulty, QuestionSource, QuestionType
from app.services.evaluation_service import evaluation_service
from app.services.question_service import question_service


INTRO_QUESTION_TEXT = "Tell me about yourself."
INTRO_QUESTION_ID = "intro-tell-me-about-yourself"


class InterviewGraphState(TypedDict, total=False):
    """
    State maintained during one adaptive interview step.

    LangGraph handles the decision flow, while Firestore remains
    the persistent source of truth for the interview.
    """

    action: Literal["start", "answer"]

    user_id: str
    interview_id: str
    resume_id: str

    job_description: str
    mode: InterviewMode
    difficulty: DifficultyLevel

    total_questions: int
    current_question_index: int

    current_question: Question
    previous_question: Question

    answer: str
    evaluation: AnswerEvaluation | BehavioralEvaluation

    covered_topics: list[str]
    weak_topics: list[str]

    next_question: Question | None

    next_difficulty: DifficultyLevel

    should_continue: bool
    result: dict


# ------------------------------------------------------------------
# Nodes
# ------------------------------------------------------------------

async def generate_initial_question(
    state: InterviewGraphState,
) -> InterviewGraphState:
    """
    The first question is always "Tell me about yourself".

    This is a universal interview opener. All subsequent questions
    are generated adaptively by the LLM based on the candidate's
    answers.
    """

    intro_question = Question(
        question_id=INTRO_QUESTION_ID,
        question=INTRO_QUESTION_TEXT,
        type=QuestionType.BEHAVIORAL,
        difficulty=QuestionDifficulty(state["difficulty"].value),
        topic="Introduction",
        skill="Self-presentation",
        source=QuestionSource.GENERAL,
        is_follow_up=False,
        expected_points=[
            "Professional background and experience",
            "Key skills relevant to the role",
            "Motivation for applying",
            "Career goals",
        ],
    )

    return {
        **state,
        "current_question": intro_question,
        "current_question_index": 0,
        "should_continue": True,
    }


async def evaluate_answer(
    state: InterviewGraphState,
) -> InterviewGraphState:
    """
    Evaluate the candidate's answer using the appropriate
    evaluator based on the interview question type.
    """

    question = state["current_question"]

    if question.type.value == "behavioral":
        evaluation = await evaluation_service.evaluate_behavioral_answer(
            question=question,
            answer=state["answer"],
        )

        # The adaptive graph currently expects AnswerEvaluation.
        # Behavioral adaptation will use the common fields below.
        return {
            **state,
            "evaluation": evaluation,
        }

    evaluation = await evaluation_service.evaluate_answer(
        user_id=state["user_id"],
        resume_id=state["resume_id"],
        question=question,
        answer=state["answer"],
    )

    return {
        **state,
        "evaluation": evaluation,
    }

def decide_next_action(
    state: InterviewGraphState,
) -> InterviewGraphState:
    """
    Decide whether to continue, finish, or change difficulty.
    """

    evaluation = state["evaluation"]

    current_index = state["current_question_index"]
    total_questions = state["total_questions"]

    difficulty = state["difficulty"]

    # Technical evaluation contains adaptive difficulty signals.
    if isinstance(evaluation, AnswerEvaluation):
        difficulty = question_service.choose_next_difficulty(
            current=state["difficulty"],
            evaluation=evaluation,
        )

    covered_topics = list(
        state.get("covered_topics", [])
    )

    weak_topics = list(
        state.get("weak_topics", [])
    )

    current_topic = state["current_question"].topic

    if current_topic not in covered_topics:
        covered_topics.append(current_topic)

    if (
        isinstance(evaluation, AnswerEvaluation)
        and evaluation.recommended_next_topic
    ):
        if evaluation.recommended_next_topic not in weak_topics:
            weak_topics.append(
                evaluation.recommended_next_topic
            )

    return {
        **state,
        "next_difficulty": difficulty,
        "covered_topics": covered_topics,
        "weak_topics": weak_topics,
        "should_continue": (
            current_index + 1 < total_questions
        ),
    }

async def generate_next_question(
    state: InterviewGraphState,
) -> InterviewGraphState:
    """
    Generate the next adaptive question.
    """

    question = await question_service.generate_next_question(
        user_id=state["user_id"],
        resume_id=state["resume_id"],
        job_description=state.get(
            "job_description",
            "",
        ),
        mode=state["mode"].value,
        difficulty=state["next_difficulty"],
        previous_question=state["current_question"],
        previous_answer=state["answer"],
        evaluation=state["evaluation"],
        covered_topics=state.get(
            "covered_topics",
            [],
        ),
        weak_topics=state.get(
            "weak_topics",
            [],
        ),
    )

    return {
        **state,
        "difficulty": state["next_difficulty"],
        "previous_question": state["current_question"],
        "current_question": question,
        "current_question_index": (
            state["current_question_index"] + 1
        ),
        "next_question": question,
    }


def finish_interview(
    state: InterviewGraphState,
) -> InterviewGraphState:
    """
    Mark the graph step as finished.

    Final interview score is calculated separately from
    Firestore after the answer has been persisted.
    """

    return {
        **state,
        "should_continue": False,
        "next_question": None,
        "result": {
            "status": "completed",
        },
    }


# ------------------------------------------------------------------
# Routing
# ------------------------------------------------------------------

def route_initial_action(
    state: InterviewGraphState,
) -> str:
    if state["action"] == "start":
        return "generate_initial"

    return "evaluate"


def route_after_decision(
    state: InterviewGraphState,
) -> str:
    if state["should_continue"]:
        return "generate_next"

    return "finish"


# ------------------------------------------------------------------
# Graph construction
# ------------------------------------------------------------------

def build_interview_graph():
    """
    Build the adaptive interview graph.

    Flow:

        START
          ↓
        route
        ↙   ↘
     start  answer
       ↓      ↓
    initial  evaluate
       ↓      ↓
       END  decision
              ↙ ↘
           next  finish
            ↓      ↓
           END    END
    """

    graph = StateGraph(InterviewGraphState)

    graph.add_node(
        "generate_initial",
        generate_initial_question,
    )

    graph.add_node(
        "evaluate",
        evaluate_answer,
    )

    graph.add_node(
        "decide",
        decide_next_action,
    )

    graph.add_node(
        "generate_next",
        generate_next_question,
    )

    graph.add_node(
        "finish",
        finish_interview,
    )

    graph.add_conditional_edges(
        START,
        route_initial_action,
        {
            "generate_initial": "generate_initial",
            "evaluate": "evaluate",
        },
    )

    graph.add_edge(
        "generate_initial",
        END,
    )

    graph.add_edge(
        "evaluate",
        "decide",
    )

    graph.add_conditional_edges(
        "decide",
        route_after_decision,
        {
            "generate_next": "generate_next",
            "finish": "finish",
        },
    )

    graph.add_edge(
        "generate_next",
        END,
    )

    graph.add_edge(
        "finish",
        END,
    )

    return graph.compile()


interview_graph = build_interview_graph()