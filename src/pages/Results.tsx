import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Download,
    FileText,
    Loader2,
    Target,
    TrendingUp,
    XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, API } from "../services/api";

type LocationState = {
    interviewId?: string;
    elapsedSeconds?: number;
};

type InterviewResultResponse = {
    interview_id?: string;
    status?: string;
    overall_score?: number;
    technical_score?: number;
    communication_score?: number;
    behavioral_score?: number;
    depth_score?: number;
    strengths?: string[];
    weaknesses?: string[];
    recommendations?: string[];
    duration_seconds?: number;
    detailed_recommendations?: {
        resume_recommendation?: string;
        interview_answer_recommendation?: string;
        general_interview_success_tip?: string;
        encouragement?: string;
    };
};

type QuestionReportItem = {
    question_id: string;
    question: string;
    answer: string;
    order?: number;
    evaluation?: { overall_score?: number; ideal_answer?: string };
};

type QuestionHistoryResponse = { history?: QuestionReportItem[] };
const EMPTY_ITEMS: string[] = [];

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${remaining.toString().padStart(2, "0")}`;
};

const ScoreBar = ({
    label,
    score,
    color = "bg-cyan-400",
}: {
    label: string;
    score?: number | null;
    color?: string;
}) => {
    if (score === undefined || score === null) return null;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
                <span>{label}</span>
                <span className="font-semibold text-white">
                    {score.toFixed(1)}/10
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                    className={`h-full rounded-full ${color} transition-all duration-700`}
                    style={{
                        width: `${Math.max(0, Math.min(100, score * 10))}%`,
                    }}
                />
            </div>
        </div>
    );
};

export default function Results() {
    const location = useLocation();
    const navigate = useNavigate();

    const locationState = (location.state || {}) as LocationState;
    const interviewId = locationState.interviewId || new URLSearchParams(location.search).get("interviewId") || "";
    const elapsedSeconds = locationState.elapsedSeconds ?? 0;

    const [data, setData] =
        useState<InterviewResultResponse | null>(null);
    const [duration, setDuration] = useState(elapsedSeconds);
    const [loading, setLoading] = useState(Boolean(interviewId));
    const [error, setError] = useState<string | null>(null);
    const [questionReports, setQuestionReports] = useState<QuestionReportItem[]>([]);

    useEffect(() => {
        if (!interviewId) {
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const [response, historyResponse] = await Promise.all([
                    api.get<InterviewResultResponse>(API.INTERVIEW(interviewId)),
                    api.get<QuestionHistoryResponse>(API.QUESTION_HISTORY(interviewId)),
                ]);

                if (cancelled) return;

                setData(response);
                setQuestionReports([...(historyResponse.history ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));

                if (typeof response.duration_seconds === "number") {
                    setDuration(response.duration_seconds);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load interview results.",
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [interviewId]);

    const score = data?.overall_score ?? null;
    const strengths = data?.strengths ?? EMPTY_ITEMS;
    const weaknesses = data?.weaknesses ?? EMPTY_ITEMS;
    const recommendations = data?.recommendations ?? EMPTY_ITEMS;
    const detailedRecommendations = data?.detailed_recommendations;

    const hasDimensionScores =
        data?.technical_score !== undefined ||
        data?.communication_score !== undefined ||
        data?.behavioral_score !== undefined ||
        data?.depth_score !== undefined;

    const downloadReport = async () => {
        // Load the PDF library only when the user requests an export so it
        // does not add work or bytes to the live interview experience.
        const { jsPDF } = await import("jspdf");
        const document = new jsPDF({ unit: "pt", format: "a4" });
        const pageHeight = document.internal.pageSize.getHeight();
        const pageWidth = document.internal.pageSize.getWidth();
        const margin = 44;
        const maxWidth = pageWidth - margin * 2;
        let y = margin;

        const addText = (text: string, size = 10, bold = false) => {
            document.setFont("helvetica", bold ? "bold" : "normal");
            document.setFontSize(size);
            const lines = document.splitTextToSize(text, maxWidth) as string[];
            const height = lines.length * (size + 4);
            if (y + height > pageHeight - margin) {
                document.addPage();
                y = margin;
            }
            document.text(lines, margin, y);
            y += height + 8;
        };

        addText("AI Interview Performance Report", 18, true);
        addText(`Overall score: ${score !== null ? `${score.toFixed(1)}/10` : "Not available"}   |   Duration: ${formatTime(duration)}`);

        questionReports.forEach((item, index) => {
            addText(`Q${index + 1}  |  Rating: ${item.evaluation?.overall_score ?? 0}/10`, 13, true);
            addText(`Question: ${item.question}`, 10, true);
            addText(`Your Answer: ${item.answer || "No answer submitted."}`);
            addText(`Ideal Answer: ${item.evaluation?.ideal_answer || "An ideal answer was not generated."}`);
        });

        if (recommendations.length) {
            addText("Recommendations", 13, true);
            recommendations.forEach((item) => addText(`• ${item}`));
        }
        if (detailedRecommendations) {
            addText("Personalized Recommendations", 13, true);
            addText(`Resume Recommendation: ${detailedRecommendations.resume_recommendation || ""}`);
            addText(`Interview Answer Recommendation: ${detailedRecommendations.interview_answer_recommendation || ""}`);
            addText(`General Interview Success Tip: ${detailedRecommendations.general_interview_success_tip || ""}`);
            addText(detailedRecommendations.encouragement || "", 10, true);
        }

        document.save(`interview-report-${interviewId || "session"}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                <div className="text-center">
                    <Loader2
                        size={36}
                        className="mx-auto mb-4 animate-spin text-cyan-400"
                    />
                    <p className="font-semibold">Preparing your results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <header className="border-b border-white/10">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                            Interview Complete
                        </p>
                        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                            Your Performance Report
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/dashboard")}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]"
                    >
                        <ArrowLeft size={15} />
                        Dashboard
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
                {error && (
                    <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-300">
                        {error}
                    </div>
                )}

                {questionReports.length > 0 && (
                    <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Answer-by-answer review</p>
                                <h2 className="mt-1 text-lg font-bold">Your interview transcript and ideal answers</h2>
                            </div>
                            <button type="button" onClick={downloadReport} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"><Download size={15} /> Download report</button>
                        </div>
                        <div className="mt-5 space-y-4">
                            {questionReports.map((item, index) => (
                                <article key={item.question_id || index} className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5">
                                    <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-cyan-300">Q{index + 1}</h3><span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-200">Rating {item.evaluation?.overall_score ?? 0} / 10</span></div>
                                    <ReportField label="Question" value={item.question} />
                                    <ReportField label="Your Answer" value={item.answer || "No answer submitted."} muted={!item.answer} />
                                    <ReportField label="Ideal Answer" value={item.evaluation?.ideal_answer || "An ideal answer was not generated."} />
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Overall Score
                        </p>

                        <div className="mt-3 flex items-end gap-2">
                            <span className="text-6xl font-extrabold tracking-tight text-cyan-300">
                                {score !== null ? score.toFixed(1) : "--"}
                            </span>
                            <span className="mb-2 text-lg font-semibold text-slate-500">
                                / 10
                            </span>
                        </div>

                        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                                style={{
                                    width: `${Math.max(0, Math.min(100, (score ?? 0) * 10))}%`,
                                }}
                            />
                        </div>

                        {hasDimensionScores && (
                            <div className="mt-5 space-y-3">
                                <ScoreBar label="Technical" score={data?.technical_score} color="bg-violet-400" />
                                <ScoreBar label="Communication" score={data?.communication_score} color="bg-emerald-400" />
                                <ScoreBar label="Depth" score={data?.depth_score} color="bg-amber-400" />
                                <ScoreBar label="Behavioral" score={data?.behavioral_score} color="bg-rose-400" />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                            <Clock3 size={20} className="text-cyan-400" />
                            <p className="mt-3 text-xs text-slate-500">Duration</p>
                            <p className="mt-1 text-lg font-bold">{formatTime(duration)}</p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                            <Target size={20} className="text-emerald-400" />
                            <p className="mt-3 text-xs text-slate-500">Status</p>
                            <p className="mt-1 text-sm font-semibold text-slate-200">
                                {data?.status === "completed" ? "Completed" : "Done"}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                            <TrendingUp size={20} className="text-violet-400" />
                            <p className="mt-3 text-xs text-slate-500">Next step</p>
                            <p className="mt-1 text-sm font-semibold text-slate-200">Review feedback</p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                            <FileText size={20} className="text-amber-400" />
                            <p className="mt-3 text-xs text-slate-500">Report</p>
                            <p className="mt-1 text-sm font-semibold text-slate-200">Available</p>
                        </div>
                    </div>
                </section>

                {(strengths.length > 0 || weaknesses.length > 0) && (
                    <section className="mt-5 grid gap-4 sm:grid-cols-2">
                        {strengths.length > 0 && (
                            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <CheckCircle2 size={18} className="text-emerald-400" />
                                    <h2 className="font-bold text-emerald-300">Strengths</h2>
                                </div>
                                <ul className="space-y-2">
                                    {strengths.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <span className="mt-0.5 text-emerald-400">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {weaknesses.length > 0 && (
                            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-5">
                                <div className="mb-3 flex items-center gap-2">
                                    <XCircle size={18} className="text-rose-400" />
                                    <h2 className="font-bold text-rose-300">Areas to Improve</h2>
                                </div>
                                <ul className="space-y-2">
                                    {weaknesses.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                            <span className="mt-0.5 text-rose-400">•</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                )}

                {recommendations.length > 0 && (
                    <section className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
                        <div className="mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-cyan-400" />
                            <h2 className="font-bold">Recommended Improvements</h2>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {recommendations.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex gap-3 rounded-xl bg-white/[0.03] p-4 text-sm leading-6 text-slate-300"
                                >
                                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {detailedRecommendations && (
                    <section className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.035] p-5 sm:p-6">
                        <div className="mb-5 flex items-center gap-2"><TrendingUp size={18} className="text-cyan-400" /><h2 className="font-bold">Recommendations</h2></div>
                        <div className="space-y-4">
                            <Recommendation label="Resume Recommendation" value={detailedRecommendations.resume_recommendation} />
                            <Recommendation label="Interview Answer Recommendation" value={detailedRecommendations.interview_answer_recommendation} />
                            <Recommendation label="General Interview Success Tip" value={detailedRecommendations.general_interview_success_tip} />
                            {detailedRecommendations.encouragement && <p className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4 text-sm leading-6 text-emerald-100">{detailedRecommendations.encouragement}</p>}
                        </div>
                    </section>
                )}

                {!data && !loading && !error && (
                    <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900 p-6 text-center">
                        <p className="text-sm text-slate-500">
                            No results available for this session yet.
                        </p>
                    </div>
                )}

                <div className="mt-8 flex justify-center">
                    <button
                        type="button"
                        onClick={() => navigate("/interview/setup")}
                        className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                    >
                        Start Another Interview
                    </button>
                </div>
            </main>
        </div>
    );
}

function ReportField({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
    return <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 whitespace-pre-wrap text-sm leading-6 ${muted ? "text-slate-500" : "text-slate-300"}`}>{value}</p></div>;
}

function Recommendation({ label, value }: { label: string; value?: string }) {
    if (!value) return null;
    return <div><p className="text-sm font-bold text-cyan-200">{label}</p><p className="mt-1 text-sm leading-6 text-slate-300">{value}</p></div>;
}

