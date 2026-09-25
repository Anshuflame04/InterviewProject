import {
    ArrowRight,
    BarChart3,
    Brain,
    FileText,
    Loader2,
    Play,
    Plus,
    Target,
    Trophy,
    Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import MetricCard from "../components/dashboard/MetricCard";
import PageHeader from "../components/common/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { api, API } from "../services/api";
import { getLlmSettings } from "../services/llmSettings";

type ResumeItem = {
    id?: string;
    resume_id?: string;
    file_name?: string;
    fileName?: string;
    name?: string;
    created_at?: string;
    createdAt?: string;
};

type InterviewItem = {
    id?: string;
    interview_id?: string;
    created_at?: string;
    createdAt?: string;
    score?: number;
    overall_score?: number;
    mode?: string;
    difficulty?: string;
};

type AnalyticsOverview = {
    total_interviews?: number;
    interview_count?: number;
    average_score?: number;
    avg_score?: number;
    best_score?: number;
    highest_score?: number;
    improvement?: number;
    score_change?: number;
};

type ListResponse<T> =
    | T[]
    | {
        resumes?: T[];
        history?: T[];
        interviews?: T[];
        items?: T[];
        data?: T[];
    };

const normalizeList = <T,>(
    response: ListResponse<T>,
): T[] => {
    if (Array.isArray(response)) return response;

    return (
        response.resumes ??
        response.history ??
        response.interviews ??
        response.items ??
        response.data ??
        []
    );
};

const getScore = (
    interview: InterviewItem,
) => {
    const value =
        interview.overall_score ??
        interview.score;

    return typeof value === "number"
        ? value
        : null;
};

const getDate = (
    interview: InterviewItem,
) =>
    interview.created_at ||
    interview.createdAt ||
    "";

const formatDate = (value: string) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        },
    );
};

const getResumeName = (
    resume: ResumeItem,
) =>
    resume.file_name ||
    resume.fileName ||
    resume.name ||
    "Uploaded Resume";

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [resumes, setResumes] =
        useState<ResumeItem[]>([]);
    const [interviews, setInterviews] =
        useState<InterviewItem[]>([]);
    const [analytics, setAnalytics] =
        useState<AnalyticsOverview | null>(
            null,
        );

    const [loading, setLoading] =
        useState(true);
    const [error, setError] =
        useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);

                const [
                    resumesResponse,
                    analyticsResponse,
                    historyResponse,
                ] = await Promise.all([
                    api.getCached<
                        ListResponse<ResumeItem>
                    >(API.RESUMES, 30_000),

                    api.getCached<AnalyticsOverview>(
                        API.ANALYTICS_OVERVIEW,
                        30_000,
                    ),

                    api.getCached<
                        ListResponse<InterviewItem>
                    >(API.ANALYTICS_HISTORY(), 30_000),
                ]);

                if (cancelled) return;

                setResumes(
                    normalizeList(
                        resumesResponse,
                    ),
                );

                setAnalytics(
                    analyticsResponse,
                );

                setInterviews(
                    normalizeList(
                        historyResponse,
                    ),
                );
            } catch (err) {
                if (cancelled) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load dashboard.",
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const recentInterviews =
        useMemo(
            () =>
                [...interviews]
                    .sort(
                        (a, b) =>
                            new Date(
                                getDate(b),
                            ).getTime() -
                            new Date(
                                getDate(a),
                            ).getTime(),
                    )
                    .slice(0, 5),
            [interviews],
        );

    const latestResume =
        resumes[0] ?? null;

    const totalInterviews =
        analytics?.total_interviews ??
        analytics?.interview_count ??
        interviews.length;

    const averageScore =
        analytics?.average_score ??
        analytics?.avg_score ??
        null;

    const bestScore =
        analytics?.best_score ??
        analytics?.highest_score ??
        null;

    const improvement =
        analytics?.improvement ??
        analytics?.score_change ??
        null;

    const displayName =
        user?.displayName ||
        user?.email?.split("@")[0] ||
        "there";
    const activeLlm = getLlmSettings();

    return (
        <div className="space-y-6">
            <PageHeader
                title={`Welcome back, ${displayName}`}
                description="Your interview preparation workspace."
                action={activeLlm ? <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-right"><p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400">Active AI model</p><p className="mt-0.5 text-xs font-bold text-cyan-100">{activeLlm.provider.toUpperCase()} · {activeLlm.model}</p></div> : <button type="button" onClick={() => navigate("/settings/api")} className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">Set up an AI model</button>}
            />

            {error && (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                    <p className="text-sm font-semibold text-amber-300">
                        Some dashboard data could not be loaded.
                    </p>
                    <p className="mt-1 text-xs text-amber-300/70">
                        {error}
                    </p>
                </div>
            )}

            <section className="overflow-hidden rounded-2xl border border-cyan-400/10 bg-gradient-to-br from-cyan-400/10 via-slate-900 to-slate-900 p-5 sm:p-7">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                            <Brain size={13} />
                            InterviewYou Workspace
                        </div>

                        <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                            Practice smarter with personalized AI interviews.
                        </h2>

                        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
                            Use your resume and target role to run structured interviews, receive answer-level feedback, and track improvement over time.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/interview/setup",
                            )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                    >
                        <Play size={17} />
                        Start Interview
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                    label="Resumes"
                    value={
                        loading
                            ? "..."
                            : String(
                                resumes.length,
                            )
                    }
                    description={
                        latestResume
                            ? "Resume available"
                            : "Upload your first resume"
                    }
                    icon={
                        <FileText
                            size={19}
                            className="text-cyan-400"
                        />
                    }
                />

                <MetricCard
                    label="Interviews"
                    value={
                        loading
                            ? "..."
                            : String(
                                totalInterviews,
                            )
                    }
                    description="Completed sessions"
                    icon={
                        <BarChart3
                            size={19}
                            className="text-violet-400"
                        />
                    }
                />

                <MetricCard
                    label="Average Score"
                    value={
                        loading
                            ? "..."
                            : averageScore !== null
                                ? `${averageScore.toFixed(1)}/10`
                                : "--"
                    }
                    description="Across completed interviews"
                    icon={
                        <Target
                            size={19}
                            className="text-emerald-400"
                        />
                    }
                />

                <MetricCard
                    label="Best Score"
                    value={
                        loading
                            ? "..."
                            : bestScore !== null
                                ? `${bestScore.toFixed(1)}/10`
                                : "--"
                    }
                    description={
                        typeof improvement ===
                            "number"
                            ? `${improvement >= 0 ? "+" : ""}${improvement.toFixed(1)} change`
                            : "No trend yet"
                    }
                    icon={
                        <Trophy
                            size={19}
                            className="text-amber-400"
                        />
                    }
                />
            </section>

            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
                <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                Resume
                            </p>
                            <h2 className="mt-1 text-lg font-bold text-white">
                                Interview profile
                            </h2>
                        </div>

                        <button
                            type="button"
                            onClick={() =>
                                navigate("/resume")
                            }
                            className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                            Manage
                        </button>
                    </div>

                    <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        {loading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2
                                    size={16}
                                    className="animate-spin"
                                />
                                Loading resume...
                            </div>
                        ) : latestResume ? (
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10">
                                        <FileText
                                            size={18}
                                            className="text-cyan-400"
                                        />
                                    </div>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {getResumeName(
                                                latestResume,
                                            )}
                                        </p>
                                        <p className="mt-1 text-xs text-emerald-400">
                                            Ready for interviews
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            "/resume",
                                        )
                                    }
                                    className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.05]"
                                >
                                    View
                                </button>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Upload
                                    size={28}
                                    className="mx-auto text-slate-600"
                                />

                                <p className="mt-3 text-sm font-semibold text-white">
                                    No resume uploaded
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Upload a resume to personalize your interviews.
                                </p>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            "/resume",
                                        )
                                    }
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.1]"
                                >
                                    <Plus size={15} />
                                    Upload Resume
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Quick Actions
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-white">
                        Keep preparing
                    </h2>

                    <div className="mt-5 space-y-2">
                        <QuickAction
                            icon={
                                <Play
                                    size={17}
                                    className="text-cyan-400"
                                />
                            }
                            title="Start Interview"
                            description="Run a personalized session"
                            onClick={() =>
                                navigate(
                                    "/interview/setup",
                                )
                            }
                        />

                        <QuickAction
                            icon={
                                <FileText
                                    size={17}
                                    className="text-violet-400"
                                />
                            }
                            title="Manage Resume"
                            description="Upload or review your resume"
                            onClick={() =>
                                navigate("/resume")
                            }
                        />

                        <QuickAction
                            icon={
                                <BarChart3
                                    size={17}
                                    className="text-emerald-400"
                                />
                            }
                            title="View Analytics"
                            description="Track scores and progress"
                            onClick={() =>
                                navigate("/analytics")
                            }
                        />
                    </div>
                </section>
            </div>

            <section className="rounded-2xl border border-white/10 bg-slate-900 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Recent Interviews
                        </p>
                        <h2 className="mt-1 text-lg font-bold text-white">
                            Your latest sessions
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/history")
                        }
                        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                        View all
                        <ArrowRight size={14} />
                    </button>
                </div>

                <div className="mt-5">
                    {loading ? (
                        <div className="flex min-h-[160px] items-center justify-center">
                            <Loader2
                                size={26}
                                className="animate-spin text-cyan-400"
                            />
                        </div>
                    ) : recentInterviews.length ===
                        0 ? (
                        <div className="py-12 text-center">
                            <BarChart3
                                size={28}
                                className="mx-auto text-slate-700"
                            />
                            <p className="mt-3 text-sm font-semibold text-white">
                                No interviews yet
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                                Complete your first interview to see it here.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentInterviews.map(
                                (
                                    interview,
                                    index,
                                ) => {
                                    const score =
                                        getScore(
                                            interview,
                                        );

                                    const id =
                                        interview.id ||
                                        interview.interview_id;

                                    return (
                                        <button
                                            key={
                                                id ||
                                                index
                                            }
                                            type="button"
                                            onClick={() =>
                                                id &&
                                                navigate(
                                                    `/results`,
                                                    {
                                                        state: {
                                                            interviewId:
                                                                id,
                                                        },
                                                    },
                                                )
                                            }
                                            className="group flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5 text-left transition hover:border-white/10 hover:bg-white/[0.04]"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-slate-500">
                                                    <Target
                                                        size={16}
                                                    />
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold capitalize text-slate-200">
                                                        {interview.mode ||
                                                            "Interview"}{" "}
                                                        session
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-600">
                                                        {formatDate(
                                                            getDate(
                                                                interview,
                                                            ),
                                                        )}
                                                        {interview.difficulty
                                                            ? ` • ${interview.difficulty}`
                                                            : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-3">
                                                <span className="text-sm font-bold text-cyan-300">
                                                    {score !==
                                                        null
                                                        ? `${score}/10`
                                                        : "--"}
                                                </span>

                                                <ArrowRight
                                                    size={15}
                                                    className="text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-slate-400"
                                                />
                                            </div>
                                        </button>
                                    );
                                },
                            )}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function QuickAction({
    icon,
    title,
    description,
    onClick,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-left hover:border-white/10 hover:bg-white/[0.05]"
        >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/[0.04]">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                    {title}
                </p>

                <p className="mt-0.5 text-xs text-slate-600">
                    {description}
                </p>
            </div>

            <ArrowRight
                size={15}
                className="text-slate-700 group-hover:text-slate-400"
            />
        </button>
    );
}
