import type { ReactNode } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Target,
} from "lucide-react";
import type {
    EvaluationDimension,
    InterviewEvaluation,
} from "../../hooks/useInterview";

type EvaluationPanelProps = {
    evaluation: InterviewEvaluation;
};

function formatList(value?: string[] | string): string[] {
    if (!value) return [];

    if (Array.isArray(value)) {
        return value.filter((item) => item.trim());
    }

    return value
        .split(/\n|•|-/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function scoreColor(score?: number) {
    if (score === undefined) return "text-slate-400";
    if (score >= 8) return "text-emerald-400";
    if (score >= 5) return "text-amber-400";
    return "text-rose-400";
}

function DimensionCard({
    label,
    value,
}: {
    label: string;
    value?: EvaluationDimension;
}) {
    if (!value) return null;

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">
                    {label}
                </span>

                {typeof value.score === "number" && (
                    <span
                        className={`text-sm font-bold ${scoreColor(
                            value.score,
                        )}`}
                    >
                        {value.score}/10
                    </span>
                )}
            </div>

            {value.feedback && (
                <p className="text-sm leading-5 text-slate-300">
                    {value.feedback}
                </p>
            )}
        </div>
    );
}

function FeedbackList({
    icon,
    title,
    items,
}: {
    icon: ReactNode;
    title: string;
    items: string[];
}) {
    if (!items.length) return null;

    return (
        <div>
            <div className="mb-2 flex items-center gap-2">
                {icon}
                <h4 className="text-sm font-semibold text-white">{title}</h4>
            </div>

            <div className="space-y-2">
                {items.map((item, index) => (
                    <div
                        key={`${title}-${index}`}
                        className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm leading-5 text-slate-300"
                    >
                        {item}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function EvaluationPanel({
    evaluation,
}: EvaluationPanelProps) {
    const strengths = formatList(evaluation.strengths);
    const weaknesses = formatList(evaluation.weaknesses);
    const missingPoints = formatList(evaluation.missing_points);

    return (
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl backdrop-blur sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        AI Evaluation
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-white">
                        Feedback on your answer
                    </h3>
                </div>

                {typeof evaluation.overall_score === "number" && (
                    <div className="shrink-0 text-right">
                        <div
                            className={`text-2xl font-extrabold ${scoreColor(
                                evaluation.overall_score,
                            )}`}
                        >
                            {evaluation.overall_score}/10
                        </div>
                        <p className="text-[11px] text-slate-500">Overall</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <DimensionCard
                    label="Technical correctness"
                    value={evaluation.technical_correctness}
                />
                <DimensionCard
                    label="Relevance"
                    value={evaluation.relevance}
                />
                <DimensionCard
                    label="Completeness"
                    value={evaluation.completeness}
                />
                <DimensionCard
                    label="Depth"
                    value={evaluation.depth}
                />
                <DimensionCard
                    label="Communication"
                    value={evaluation.communication}
                />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <FeedbackList
                    icon={<CheckCircle2 size={16} className="text-emerald-400" />}
                    title="Strengths"
                    items={strengths}
                />

                <FeedbackList
                    icon={<AlertTriangle size={16} className="text-amber-400" />}
                    title="Areas to improve"
                    items={weaknesses}
                />

                <FeedbackList
                    icon={<Target size={16} className="text-rose-400" />}
                    title="Missing points"
                    items={missingPoints}
                />
            </div>

            {evaluation.ideal_answer && (
                <div className="mt-5 rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-4">
                    <div className="mb-2 flex items-center gap-2">
                        <Lightbulb size={16} className="text-cyan-400" />
                        <h4 className="text-sm font-semibold text-white">
                            What a stronger answer could include
                        </h4>
                    </div>

                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                        {evaluation.ideal_answer}
                    </p>
                </div>
            )}

            {(evaluation.follow_up_question ||
                evaluation.recommended_next_topic) && (
                    <div className="mt-4 space-y-2">
                        {evaluation.follow_up_question && (
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Possible follow-up
                                </span>
                                <p className="mt-1 text-sm text-slate-300">
                                    {evaluation.follow_up_question}
                                </p>
                            </div>
                        )}

                        {evaluation.recommended_next_topic && (
                            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Recommended next topic
                                </span>
                                <p className="mt-1 text-sm font-medium text-cyan-300">
                                    {evaluation.recommended_next_topic}
                                </p>
                            </div>
                        )}
                    </div>
                )}

            {(evaluation.should_increase_difficulty ||
                evaluation.should_decrease_difficulty) && (
                    <div className="mt-4 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-slate-400">
                        Difficulty will be adjusted based on this evaluation.
                    </div>
                )}
        </section>
    );
}