import {
    ArrowUpRight,
    BarChart3,
    Brain,
    Loader2,
    Target,
    TrendingUp,
    Trophy,
} from "lucide-react";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import PageHeader from "../components/common/PageHeader";
import { api, API } from "../services/api";

/* =========================================================
   TYPES
========================================================= */

type AnalyticsHistoryItem = {
    id?: string;
    interview_id?: string;
    created_at?: string;
    createdAt?: string;
    score?: number;
    overall_score?: number;
    weak_topics?: string[];
    weaknesses?: string[];
    recommendations?: string[];
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
    weak_topics?: string[];
    recommendations?: string | string[];
};

type AnalyticsHistoryResponse =
    | AnalyticsHistoryItem[]
    | {
        history?: AnalyticsHistoryItem[];
        interviews?: AnalyticsHistoryItem[];
        items?: AnalyticsHistoryItem[];
        data?: AnalyticsHistoryItem[];
        has_more?: boolean;
    };

/* =========================================================
   HELPERS
========================================================= */

function normalizeHistory(
    response: AnalyticsHistoryResponse,
): AnalyticsHistoryItem[] {
    if (Array.isArray(response)) {
        return response;
    }

    return (
        response.history ??
        response.interviews ??
        response.items ??
        response.data ??
        []
    );
}

function normalizeList(
    value?: string | string[],
): string[] {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    return value
        .split(/\n|•|-/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function getScore(
    item: AnalyticsHistoryItem,
): number | null {
    const value =
        item.overall_score ??
        item.score;

    return typeof value === "number"
        ? value
        : null;
}

function getDate(
    item: AnalyticsHistoryItem,
): string {
    return (
        item.created_at ||
        item.createdAt ||
        ""
    );
}

function formatDate(
    value: string,
): string {
    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
        },
    );
}

function formatDateTime(value: string): string {
    if (!value) return "Interview date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Interview date unavailable";
    return date.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function clampScore(
    score: number,
): number {
    return Math.max(
        0,
        Math.min(10, score),
    );
}

function buildChartPoints(
    values: number[],
    width: number,
    height: number,
    padding: number,
): string {
    if (!values.length) {
        return "";
    }

    const innerWidth =
        width - padding * 2;

    const innerHeight =
        height - padding * 2;

    if (values.length === 1) {
        const x = width / 2;

        const y =
            padding +
            innerHeight -
            (clampScore(values[0]) / 10) *
            innerHeight;

        return `${x},${y}`;
    }

    return values
        .map((value, index) => {
            const x =
                padding +
                (index /
                    (values.length - 1)) *
                innerWidth;

            const y =
                padding +
                innerHeight -
                (clampScore(value) / 10) *
                innerHeight;

            return `${x},${y}`;
        })
        .join(" ");
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Analytics() {
    const [overview, setOverview] =
        useState<AnalyticsOverview | null>(
            null,
        );

    const [history, setHistory] =
        useState<AnalyticsHistoryItem[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    /* =====================================================
       LOAD DATA
    ====================================================== */

    useEffect(() => {
        let cancelled = false;

        const loadAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);

                const [
                    overviewResponse,
                    historyResponse,
                ] = await Promise.all([
                    api.getCached<AnalyticsOverview>(
                        API.ANALYTICS_OVERVIEW,
                        30_000,
                    ),

                    api.getCached<AnalyticsHistoryResponse>(
                        API.ANALYTICS_HISTORY(),
                        30_000,
                    ),
                ]);

                if (cancelled) {
                    return;
                }

                setOverview(
                    overviewResponse,
                );

                setHistory(
                    normalizeHistory(
                        historyResponse,
                    ),
                );
                setHasMore(!Array.isArray(historyResponse) && Boolean(historyResponse.has_more));
            } catch (err) {
                if (cancelled) {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load analytics.",
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadAnalytics();

        return () => {
            cancelled = true;
        };
    }, []);

    const loadMore = async () => {
        try {
            setLoadingMore(true);
            const response = await api.get<AnalyticsHistoryResponse>(
                API.ANALYTICS_HISTORY(5, history.length),
            );
            setHistory((current) => [...current, ...normalizeHistory(response)]);
            setHasMore(!Array.isArray(response) && Boolean(response.has_more));
        } finally {
            setLoadingMore(false);
        }
    };

    /* =====================================================
       CALCULATIONS
    ====================================================== */

    const scores = useMemo(() => {
        return history
            .map((item) => ({
                score: getScore(item),
                date: getDate(item),
            }))
            .filter(
                (
                    item,
                ): item is {
                    score: number;
                    date: string;
                } =>
                    item.score !== null,
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.date,
                    ).getTime() -
                    new Date(
                        b.date,
                    ).getTime(),
            );
    }, [history]);

    const totalInterviews =
        overview?.total_interviews ??
        overview?.interview_count ??
        history.length;

    const averageScore =
        overview?.average_score ??
        overview?.avg_score ??
        (scores.length
            ? scores.reduce(
                (
                    total,
                    item,
                ) =>
                    total +
                    item.score,
                0,
            ) / scores.length
            : null);

    const bestScore =
        overview?.best_score ??
        overview?.highest_score ??
        (scores.length
            ? Math.max(
                ...scores.map(
                    (item) =>
                        item.score,
                ),
            )
            : null);

    const improvement =
        overview?.improvement ??
        overview?.score_change ??
        null;

    const weakTopics = [
        ...(overview?.weak_topics ??
            []),

        ...history.flatMap(
            (item) =>
                item.weak_topics ??
                [],
        ),
        ...history.flatMap((item) => item.weaknesses ?? []),
    ];

    const uniqueWeakTopics = [
        ...new Set(weakTopics),
    ].slice(0, 6);

    const recommendations =
        [...new Set([
            ...normalizeList(overview?.recommendations),
            ...history.flatMap((item) => item.recommendations ?? []),
        ])].slice(0, 4);

    /* =====================================================
       COMPACT CHART
    ====================================================== */

    const chartWidth = 720;
    const chartHeight = 190;
    const chartPadding = 28;

    const chartPoints =
        buildChartPoints(
            scores.map(
                (item) => item.score,
            ),
            chartWidth,
            chartHeight,
            chartPadding,
        );

    /* =====================================================
       PAGE
    ====================================================== */

    return (
        <div className="space-y-3">
            {/* HEADER */}
            <PageHeader
                title="Analytics"
                description="Track your interview performance and identify areas to improve."
            />

            {/* =================================================
                LOADING
            ================================================== */}

            {loading && (
                <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
                    <div className="text-center">
                        <Loader2
                            size={28}
                            className="mx-auto mb-2 animate-spin text-cyan-400"
                        />

                        <p className="text-sm font-semibold text-slate-300">
                            Building your analytics...
                        </p>
                    </div>
                </div>
            )}

            {/* =================================================
                ERROR
            ================================================== */}

            {!loading && error && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4">
                    <p className="font-semibold text-rose-300">
                        Analytics unavailable
                    </p>

                    <p className="mt-1 text-sm text-rose-300/70">
                        {error}
                    </p>
                </div>
            )}

            {/* =================================================
                CONTENT
            ================================================== */}

            {!loading && !error && (
                <div className="space-y-3">
                    {/* =================================================
                        METRICS
                    ================================================== */}

                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <MetricCard
                            icon={
                                <BarChart3
                                    size={18}
                                    className="text-cyan-400"
                                />
                            }
                            label="Interviews"
                            value={String(
                                totalInterviews,
                            )}
                        />

                        <MetricCard
                            icon={
                                <Target
                                    size={18}
                                    className="text-emerald-400"
                                />
                            }
                            label="Average Score"
                            value={
                                averageScore !==
                                    null
                                    ? `${averageScore.toFixed(
                                        1,
                                    )}/10`
                                    : "--"
                            }
                        />

                        <MetricCard
                            icon={
                                <Trophy
                                    size={18}
                                    className="text-amber-400"
                                />
                            }
                            label="Best Score"
                            value={
                                bestScore !==
                                    null
                                    ? `${bestScore.toFixed(
                                        1,
                                    )}/10`
                                    : "--"
                            }
                        />

                        <MetricCard
                            icon={
                                <TrendingUp
                                    size={18}
                                    className="text-violet-400"
                                />
                            }
                            label="Change"
                            value={
                                typeof improvement ===
                                    "number"
                                    ? `${improvement >=
                                        0
                                        ? "+"
                                        : ""
                                    }${improvement.toFixed(
                                        1,
                                    )}`
                                    : "--"
                            }
                        />
                    </section>

                    {/* =================================================
                        CHART
                    ================================================== */}

                    <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    Performance Trend
                                </p>

                                <h2 className="mt-0.5 text-base font-bold text-white">
                                    Interview Scores
                                </h2>
                            </div>

                            <TrendingUp
                                size={18}
                                className="text-cyan-400"
                            />
                        </div>

                        {scores.length ===
                            0 ? (
                            <div className="flex h-[170px] items-center justify-center">
                                <p className="text-sm text-slate-500">
                                    Complete an interview to
                                    see your score trend.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-2">
                                <div className="overflow-hidden rounded-xl bg-slate-950/60 px-2 py-1">
                                    <svg
                                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                        className="h-[155px] w-full"
                                        role="img"
                                        aria-label="Interview score trend"
                                    >
                                        {[0, 2.5, 5, 7.5, 10].map(
                                            (value) => {
                                                const y =
                                                    chartPadding +
                                                    chartHeight -
                                                    chartPadding *
                                                    2 -
                                                    (value /
                                                        10) *
                                                    (chartHeight -
                                                        chartPadding *
                                                        2);

                                                return (
                                                    <line
                                                        key={
                                                            value
                                                        }
                                                        x1={
                                                            chartPadding
                                                        }
                                                        x2={
                                                            chartWidth -
                                                            chartPadding
                                                        }
                                                        y1={
                                                            y
                                                        }
                                                        y2={
                                                            y
                                                        }
                                                        stroke="currentColor"
                                                        className="text-white/5"
                                                    />
                                                );
                                            },
                                        )}

                                        <polyline
                                            points={
                                                chartPoints
                                            }
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-cyan-400"
                                        />

                                        {scores.map(
                                            (
                                                item,
                                                index,
                                            ) => {
                                                const x =
                                                    scores.length ===
                                                        1
                                                        ? chartWidth /
                                                        2
                                                        : chartPadding +
                                                        (index /
                                                            (scores.length -
                                                                1)) *
                                                        (chartWidth -
                                                            chartPadding *
                                                            2);

                                                const y =
                                                    chartPadding +
                                                    (chartHeight -
                                                        chartPadding *
                                                        2) -
                                                    (clampScore(
                                                        item.score,
                                                    ) /
                                                        10) *
                                                    (chartHeight -
                                                        chartPadding *
                                                        2);

                                                return (
                                                    <circle
                                                        key={`${item.date}-${index}`}
                                                        cx={
                                                            x
                                                        }
                                                        cy={
                                                            y
                                                        }
                                                        r="5"
                                                        fill="currentColor"
                                                        className="text-cyan-300"
                                                    ><title>{`${formatDateTime(item.date)} — Score ${item.score.toFixed(1)}/10`}</title></circle>
                                                );
                                            },
                                        )}
                                    </svg>
                                </div>

                                <div className="mt-1 flex justify-between gap-2 text-[10px] text-slate-600">
                                    {scores
                                        .slice(
                                            -5,
                                        )
                                        .map(
                                            (
                                                item,
                                                index,
                                            ) => (
                                                <span
                                                    key={`${item.date}-${index}`}
                                                >
                                                    {formatDate(
                                                        item.date,
                                                    )}
                                                </span>
                                            ),
                                        )}
                                </div>
                            </div>
                        )}
                        {hasMore && (
                            <div className="mt-4 text-center">
                                <button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">
                                    {loadingMore ? "Loading..." : "Load 5 more sessions"}
                                </button>
                            </div>
                        )}
                    </section>

                    {/* =================================================
                        BOTTOM ROW
                    ================================================== */}

                    <section className="grid gap-3 lg:grid-cols-2">
                        {/* Weak Topics */}
                        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                            <div className="flex items-center gap-2">
                                <Brain
                                    size={18}
                                    className="text-violet-400"
                                />

                                <div>
                                    <h2 className="text-sm font-bold text-white">
                                        Topics to Strengthen
                                    </h2>

                                    <p className="text-[10px] text-slate-600">
                                        Areas requiring more practice
                                    </p>
                                </div>
                            </div>

                            {uniqueWeakTopics.length ===
                                0 ? (
                                <p className="mt-4 text-sm leading-5 text-slate-500">
                                    Topic-level weakness data
                                    will appear here as
                                    interview evaluations
                                    accumulate.
                                </p>
                            ) : (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {uniqueWeakTopics.map(
                                        (
                                            topic,
                                        ) => (
                                            <span
                                                key={
                                                    topic
                                                }
                                                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-300"
                                            >
                                                {
                                                    topic
                                                }
                                            </span>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Recommendations */}
                        <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                            <div className="flex items-center gap-2">
                                <ArrowUpRight
                                    size={18}
                                    className="text-cyan-400"
                                />

                                <div>
                                    <h2 className="text-sm font-bold text-white">
                                        Recommendations
                                    </h2>

                                    <p className="text-[10px] text-slate-600">
                                        Personalized improvement tips
                                    </p>
                                </div>
                            </div>

                            {recommendations.length ===
                                0 ? (
                                <p className="mt-4 text-sm leading-5 text-slate-500">
                                    Personalized recommendations
                                    will appear here as you
                                    complete more interviews.
                                </p>
                            ) : (
                                <div className="mt-3 grid gap-2">
                                    {recommendations.map(
                                        (
                                            recommendation,
                                            index,
                                        ) => (
                                            <div
                                                key={
                                                    index
                                                }
                                                className="rounded-lg bg-white/[0.03] px-3 py-2 text-xs leading-5 text-slate-300"
                                            >
                                                {
                                                    recommendation
                                                }
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-3.5">
            <div className="flex items-center justify-between">
                {icon}
            </div>

            <p className="mt-2.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p className="mt-0.5 text-lg font-extrabold text-white sm:text-xl">
                {value}
            </p>
        </div>
    );
}
