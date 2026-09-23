import { useCallback, useEffect, useState } from "react";
import { api, API } from "../services/api";

export type InterviewQuestion = {
    question_id?: string;
    question: string;
    type?: string;
    difficulty?: string;
    topic?: string;
    skill?: string;
    source?: string;
    is_follow_up?: boolean;
    parent_question_id?: string;
    expected_points?: string[];
};

export type EvaluationDimension = {
    score?: number;
    feedback?: string;
};

export type InterviewEvaluation = {
    overall_score?: number;

    technical_correctness?: EvaluationDimension;
    relevance?: EvaluationDimension;
    completeness?: EvaluationDimension;
    depth?: EvaluationDimension;
    communication?: EvaluationDimension;

    strengths?: string[] | string;
    weaknesses?: string[] | string;
    missing_points?: string[] | string;

    ideal_answer?: string;
    follow_up_question?: string;
    recommended_next_topic?: string;

    should_increase_difficulty?: boolean;
    should_decrease_difficulty?: boolean;
};

export type InterviewRuntimeResult = {
    score?: number;
    overall_score?: number;
    recommendations?: string | string[];
    feedback?: unknown[];
    [key: string]: unknown;
};

type InterviewDetail = {
    id?: string;
    interview_id?: string;
    llm_provider?: string;
    llmProvider?: string;
    llm_model?: string;
    llmModel?: string;

    total_questions?: number;
    totalQuestions?: number;
    current_question_index?: number;
    currentQuestionIndex?: number;

    result?: InterviewRuntimeResult | null;
    evaluation?: InterviewEvaluation | null;

    [key: string]: unknown;
};

type EvaluationResponse = {
    evaluation?: InterviewEvaluation | null;

    result?: InterviewRuntimeResult | null;

    next_question?: unknown;
    nextQuestion?: unknown;
    question?: unknown;

    should_continue?: boolean;
    shouldContinue?: boolean;

    current_question?: unknown;
    currentQuestion?: unknown;

    current_question_index?: number;
    currentQuestionIndex?: number;
    llm_provider?: string;
    llmProvider?: string;
    llm_model?: string;
    llmModel?: string;
    [key: string]: unknown;
};

export type InterviewStatus =
    | "loading"
    | "ready"
    | "submitting"
    | "completed"
    | "error";

const normalizeQuestion = (
    value: unknown,
): InterviewQuestion | null => {
    if (!value) return null;

    if (typeof value === "string") {
        return {
            question: value,
        };
    }

    if (typeof value !== "object") {
        return null;
    }

    const item = value as Record<string, unknown>;

    const questionText =
        item.question ??
        item.text ??
        item.question_text;

    if (typeof questionText !== "string" || !questionText.trim()) {
        return null;
    }

    return {
        question_id:
            typeof item.question_id === "string"
                ? item.question_id
                : typeof item.id === "string"
                    ? item.id
                    : undefined,

        question: questionText,

        type:
            typeof item.type === "string"
                ? item.type
                : undefined,

        difficulty:
            typeof item.difficulty === "string"
                ? item.difficulty
                : undefined,

        topic:
            typeof item.topic === "string"
                ? item.topic
                : undefined,

        skill:
            typeof item.skill === "string"
                ? item.skill
                : undefined,

        source:
            typeof item.source === "string"
                ? item.source
                : undefined,

        is_follow_up:
            typeof item.is_follow_up === "boolean"
                ? item.is_follow_up
                : typeof item.isFollowUp === "boolean"
                    ? item.isFollowUp
                    : undefined,

        parent_question_id:
            typeof item.parent_question_id === "string"
                ? item.parent_question_id
                : undefined,

        expected_points:
            Array.isArray(item.expected_points)
                ? item.expected_points.filter(
                    (point): point is string =>
                        typeof point === "string",
                )
                : undefined,
    };
};

const normalizeEvaluation = (
    value: unknown,
): InterviewEvaluation | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const evaluation = value as InterviewEvaluation;

    return {
        ...evaluation,
        overall_score:
            typeof evaluation.overall_score === "number"
                ? evaluation.overall_score
                : undefined,
    };
};

export function useInterview(interviewId?: string) {
    const [question, setQuestion] =
        useState<InterviewQuestion | null>(null);

    const [evaluation, setEvaluation] =
        useState<InterviewEvaluation | null>(null);

    const [result, setResult] =
        useState<InterviewRuntimeResult | null>(null);

    const [pendingNextQuestion, setPendingNextQuestion] =
        useState<InterviewQuestion | null>(null);

    const [totalQuestions, setTotalQuestions] =
        useState(0);

    const [questionIndex, setQuestionIndex] =
        useState(0);

    const [llmModel, setLlmModel] = useState<string | null>(null);

    const [status, setStatus] =
        useState<InterviewStatus>("loading");

    const [error, setError] =
        useState<string | null>(null);

    const [shouldContinue, setShouldContinue] =
        useState(true);

    /**
     * Loads interview metadata.
     *
     * We keep this separate from the current-question endpoint
     * because the interview detail contains useful session metadata
     * such as total question count.
     */
    const loadInterview = useCallback(async () => {
        if (!interviewId) return null;

        const response =
            await api.get<InterviewDetail>(
                API.INTERVIEW(interviewId),
            );

        const total =
            response.total_questions ??
            response.totalQuestions;

        const index =
            response.current_question_index ??
            response.currentQuestionIndex;

        if (typeof total === "number") {
            setTotalQuestions(total);
        }

        if (typeof index === "number") {
            setQuestionIndex(index);
        }

        const provider = response.llm_provider ?? response.llmProvider;
        const model = response.llm_model ?? response.llmModel;
        if (model) setLlmModel(provider ? `${provider} / ${model}` : model);

        if (response.result) {
            setResult(response.result);
        }

        if (response.evaluation) {
            setEvaluation(
                normalizeEvaluation(response.evaluation),
            );
        }

        return response;
    }, [interviewId]);

    /**
     * Loads the currently active question.
     */
    const loadCurrentQuestion = useCallback(async () => {
        if (!interviewId) {
            setError("Interview session is missing.");
            setStatus("error");
            return;
        }

        try {
            setError(null);

            const response =
                await api.get<unknown>(
                    API.CURRENT_QUESTION(interviewId),
                );

            const root =
                response &&
                    typeof response === "object"
                    ? (response as Record<string, unknown>)
                    : {};

            const normalized =
                normalizeQuestion(
                    root.question ??
                    root.current_question ??
                    root.currentQuestion ??
                    response,
                );

            if (!normalized) {
                throw new Error(
                    "The backend did not return a valid interview question.",
                );
            }

            setQuestion(normalized);
            setStatus("ready");
        } catch (err) {
            console.error(
                "Failed to load interview question:",
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load the interview question.",
            );

            setStatus("error");
        }
    }, [interviewId]);

    /**
     * Initial interview load.
     */
    useEffect(() => {
        if (!interviewId) {
            return;
        }

        let cancelled = false;

        const initialize = async () => {
            try {
                setStatus("loading");

                await loadInterview();

                if (cancelled) return;

                await loadCurrentQuestion();
            } catch (err) {
                if (cancelled) return;

                console.error(
                    "Failed to initialize interview:",
                    err,
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to initialize interview.",
                );

                setStatus("error");
            }
        };

        initialize();

        return () => {
            cancelled = true;
        };
    }, [
        interviewId,
        loadInterview,
        loadCurrentQuestion,
    ]);

    /**
     * Sends the candidate answer to the evaluation endpoint.
     */
    const submitAnswer = useCallback(
        async (answer: string) => {
            if (!interviewId) {
                throw new Error("Interview session is missing.");
            }

            if (!question) {
                throw new Error("There is no active question.");
            }

            setStatus("submitting");
            setError(null);

            try {
                const response =
                    await api.post<EvaluationResponse>(
                        API.EVALUATE_ANSWER,
                        {
                            interview_id: interviewId,
                            question_id:
                                question.question_id ?? question.question,
                            answer,
                        },
                    );

                /*
                 * Evaluation is stored immediately so the UI can show
                 * feedback before advancing to the next question.
                 */
                const nextEvaluation =
                    normalizeEvaluation(
                        response.evaluation,
                    );

                if (nextEvaluation) {
                    setEvaluation(nextEvaluation);
                }

                if (response.result) {
                    setResult(response.result);
                }

                const continueFlag =
                    response.should_continue ??
                    response.shouldContinue;

                if (typeof continueFlag === "boolean") {
                    setShouldContinue(continueFlag);
                }

                /*
                 * The backend may call the next question by any of these
                 * documented/runtime names. Normalize them centrally.
                 */
                const nextQuestion =
                    normalizeQuestion(
                        response.next_question ??
                        response.nextQuestion ??
                        response.question ??
                        response.current_question ??
                        response.currentQuestion,
                    );

                if (nextQuestion) {
                    setPendingNextQuestion(nextQuestion);
                } else if (continueFlag === false) {
                    setPendingNextQuestion(null);
                }

                /*
                 * If the backend has ended the interview, expose the
                 * completed state instead of trying to load another question.
                 */
                if (
                    continueFlag === false &&
                    !nextQuestion
                ) {
                    setStatus("completed");
                } else {
                    setStatus("ready");
                }

                return response;
            } catch (err) {
                console.error(
                    "Failed to submit interview answer:",
                    err,
                );

                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to evaluate your answer.";

                setError(message);
                setStatus("error");

                throw err;
            }
        },
        [interviewId, question],
    );

    /**
     * Submits the answer and immediately advances to the next question
     * or finishes the interview (no intermediate evaluation screen).
     */
    const submitAndNext = useCallback(
        async (answer: string, durationSeconds?: number) => {
            if (!interviewId) {
                throw new Error("Interview session is missing.");
            }

            if (!question) {
                throw new Error("There is no active question.");
            }

            setStatus("submitting");
            setError(null);

            try {
                const response = await api.post<EvaluationResponse>(
                    API.EVALUATE_ANSWER,
                    {
                        interview_id: interviewId,
                        question_id:
                            question.question_id ?? question.question,
                        answer,
                        duration_seconds: durationSeconds,
                    },
                );

                if (response.result) {
                    setResult(response.result);
                }

                const continueFlag =
                    response.should_continue ?? response.shouldContinue;

                const nextQuestion = normalizeQuestion(
                    response.next_question ??
                    response.nextQuestion ??
                    response.question ??
                    response.current_question ??
                    response.currentQuestion,
                );

                if (continueFlag === false) {
                    setShouldContinue(false);
                    setStatus("completed");
                    return { completed: true, nextQuestion: null };
                }

                if (!nextQuestion) {
                    throw new Error(
                        "The next interview question was not returned.",
                    );
                }

                setQuestion(nextQuestion);
                setEvaluation(null);
                setPendingNextQuestion(null);
                const nextIndex =
                    response.current_question_index ??
                    response.currentQuestionIndex;

                setQuestionIndex((current) =>
                    typeof nextIndex === "number"
                        ? nextIndex
                        : current + 1,
                );
                setStatus("ready");

                return { completed: false, nextQuestion };
            } catch (err) {
                console.error("Failed to submit interview answer:", err);
                const message =
                    err instanceof Error
                        ? err.message
                        : "Failed to evaluate your answer.";
                setError(message);
                setStatus("error");
                throw err;
            }
        },
        [interviewId, question],
    );

    /**
     * Promotes the evaluated next question into the active question.
     */
    const continueToNextQuestion = useCallback(() => {
        if (!pendingNextQuestion) {
            return false;
        }

        setQuestion(pendingNextQuestion);
        setPendingNextQuestion(null);

        setEvaluation(null);

        setQuestionIndex(
            (current) => current + 1,
        );

        setStatus("ready");

        return true;
    }, [pendingNextQuestion]);

    /**
     * Allows retrying a failed current-question request.
     */
    const retry = useCallback(async () => {
        setStatus("loading");
        setError(null);

        try {
            await loadInterview();
            await loadCurrentQuestion();
        } catch (err) {
            console.error(
                "Interview retry failed:",
                err,
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Retry failed.",
            );

            setStatus("error");
        }
    }, [
        loadInterview,
        loadCurrentQuestion,
    ]);

    const isLastQuestion =
        totalQuestions > 0 &&
        questionIndex >= totalQuestions - 1;

    return {
        question,
        evaluation,
        result,

        pendingNextQuestion,

        totalQuestions,
        questionIndex,
        llmModel,
        isLastQuestion,

        status,
        error,
        shouldContinue,

        submitAnswer,
        submitAndNext,
        continueToNextQuestion,
        retry,
        loadCurrentQuestion,
    };
}
