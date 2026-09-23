import {
    ArrowRight,
    CalendarDays,
    Clock3,
    FileText,
    Loader2,
    Search,
    Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/common/PageHeader";
import { api, API } from "../services/api";

type HistoryItem = {
    id: string;
    interview_id?: string;
    created_at?: string;
    createdAt?: string;
    score?: number;
    overall_score?: number;
    duration_seconds?: number;
    durationSeconds?: number;
    mode?: string;
    difficulty?: string;
    status?: string;
};

type HistoryResponse =
    | HistoryItem[]
    | {
        history?: HistoryItem[];
        interviews?: HistoryItem[];
        items?: HistoryItem[];
        data?: HistoryItem[];
        has_more?: boolean;
    };

const normalizeHistory = (response: HistoryResponse): HistoryItem[] => {
    if (Array.isArray(response)) return response;
    return response.history ?? response.interviews ?? response.items ?? response.data ?? [];
};

const getScore = (item: HistoryItem) =>
    typeof (item.overall_score ?? item.score) === "number"
        ? (item.overall_score ?? item.score)!
        : null;

const formatDate = (value?: string) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const formatDuration = (seconds?: number) => {
    if (typeof seconds !== "number") return "--";

    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
};

export default function History() {
    const navigate = useNavigate();

    const [interviews, setInterviews] = useState<HistoryItem[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await api.getCached<HistoryResponse>(
                    API.ANALYTICS_HISTORY(),
                    30_000,
                );

                if (!cancelled) {
                    setInterviews(normalizeHistory(response));
                    setHasMore(!Array.isArray(response) && Boolean(response.has_more));
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load interview history.",
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
    }, []);

    const loadMore = async () => {
        try {
            setLoadingMore(true);
            const response = await api.get<HistoryResponse>(
                API.ANALYTICS_HISTORY(5, interviews.length),
            );
            const nextItems = normalizeHistory(response);
            setInterviews((current) => [...current, ...nextItems]);
            setHasMore(!Array.isArray(response) && Boolean(response.has_more));
        } finally {
            setLoadingMore(false);
        }
    };

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return interviews;

        return interviews.filter((item) =>
            [
                item.mode,
                item.difficulty,
                item.status,
                item.created_at,
                item.createdAt,
                getScore(item),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query),
        );
    }, [interviews, search]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Interview History"
                description="Review previous interview sessions and open their reports."
            />

            <div className="relative max-w-xl">
                <Search
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search interviews..."
                    className="w-full rounded-xl border border-white/10 bg-slate-900 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                />
            </div>

            {loading && (
                <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
                    <div className="text-center">
                        <Loader2
                            size={30}
                            className="mx-auto mb-3 animate-spin text-cyan-400"
                        />
                        <p className="text-sm text-slate-400">
                            Loading interview history...
                        </p>
                    </div>
                </div>
            )}

            {!loading && error && (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-5">
                    <p className="font-semibold text-rose-300">
                        Could not load interview history
                    </p>
                    <p className="mt-1 text-sm text-rose-300/70">{error}</p>
                </div>
            )}

            {!loading && !error && filtered.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-slate-900 p-10 text-center">
                    <FileText
                        size={34}
                        className="mx-auto mb-4 text-slate-600"
                    />

                    <h2 className="font-semibold text-white">
                        {search ? "No matching interviews" : "No interviews yet"}
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        {search
                            ? "Try another search term."
                            : "Complete your first interview and it will appear here."}
                    </p>

                    {!search && (
                        <button
                            onClick={() => navigate("/interview/setup")}
                            className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                        >
                            Start Interview
                        </button>
                    )}
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div className="space-y-3">
                    {filtered.map((interview, index) => {
                        const id = interview.interview_id || interview.id;
                        const score = getScore(interview);
                        const duration =
                            interview.duration_seconds ??
                            interview.durationSeconds;

                        return (
                            <article
                                key={id || index}
                                className="rounded-2xl border border-white/10 bg-slate-900 p-4 transition hover:border-cyan-400/20 sm:p-5"
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-300">
                                                {interview.mode || "Interview"}
                                            </span>

                                            {interview.status && (
                                                <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] capitalize text-slate-400">
                                                    {interview.status}
                                                </span>
                                            )}
                                        </div>

                                        <h2 className="mt-2 font-bold text-white">
                                            {interview.mode
                                                ? `${interview.mode} Interview`
                                                : "Interview Session"}
                                        </h2>

                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-1.5">
                                                <CalendarDays size={13} />
                                                {formatDate(
                                                    interview.created_at ??
                                                    interview.createdAt,
                                                )}
                                            </span>

                                            <span className="inline-flex items-center gap-1.5">
                                                <Clock3 size={13} />
                                                {formatDuration(duration)}
                                            </span>

                                            {interview.difficulty && (
                                                <span className="capitalize">
                                                    {interview.difficulty}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                                        <div className="flex items-center gap-2">
                                            <Trophy
                                                size={17}
                                                className="text-amber-400"
                                            />
                                            <div>
                                                <p className="text-xs text-slate-500">
                                                    Score
                                                </p>
                                                <p className="text-lg font-extrabold text-white">
                                                    {score !== null
                                                        ? `${score}/10`
                                                        : "--"}
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() =>
                                                navigate("/results", {
                                                    state: {
                                                        interviewId: id,
                                                    },
                                                })
                                            }
                                            disabled={!id}
                                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-40"
                                        >
                                            View
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                    {!search && hasMore && (
                        <div className="pt-2 text-center">
                            <button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50">
                                {loadingMore ? "Loading..." : "Load 5 more interviews"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
