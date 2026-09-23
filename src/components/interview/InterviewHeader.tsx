import {
    Clock3,
    ShieldCheck,
} from "lucide-react";

type InterviewHeaderProps = {
    currentQuestion: number;
    totalQuestions: number;
    elapsedSeconds: number;
    title?: string;
    llmModel?: string | null;
};

function formatTime(seconds: number) {
    const minutes = Math.floor(
        seconds / 60,
    );

    const remaining = seconds % 60;

    return `${minutes}:${remaining
        .toString()
        .padStart(2, "0")}`;
}

export default function InterviewHeader({
    currentQuestion,
    totalQuestions,
    elapsedSeconds,
    title = "AI Interview",
    llmModel,
}: InterviewHeaderProps) {
    const progress =
        totalQuestions > 0
            ? Math.min(
                100,
                (currentQuestion /
                    totalQuestions) *
                100,
            )
            : 0;

    return (
        <header className="border-b border-white/[0.07] bg-slate-950/90 backdrop-blur-xl">
            <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                        {title}
                    </p>

                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <ShieldCheck
                            size={12}
                            className="text-emerald-400"
                        />
                        Session active
                        {llmModel && <><span className="text-slate-700">•</span><span className="truncate text-cyan-300">{llmModel}</span></>}
                    </div>
                </div>

                <div className="hidden w-full max-w-md items-center gap-3 md:flex">
                    <span className="shrink-0 text-xs font-medium text-slate-400">
                        Q{currentQuestion}
                        {totalQuestions > 0
                            ? ` / ${totalQuestions}`
                            : ""}
                    </span>

                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{
                                width: `${progress}%`,
                            }}
                        />
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                    <Clock3
                        size={15}
                        className="text-blue-400"
                    />

                    <span className="tabular-nums text-xs font-medium text-slate-300">
                        {formatTime(
                            elapsedSeconds,
                        )}
                    </span>
                </div>
            </div>

            <div className="px-4 pb-2 md:hidden">
                <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-600">
                    <span>
                        Question {currentQuestion}
                    </span>

                    {totalQuestions > 0 && (
                        <span>
                            {totalQuestions} total
                        </span>
                    )}
                </div>

                <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{
                            width: `${progress}%`,
                        }}
                    />
                </div>
            </div>
        </header>
    );
}
