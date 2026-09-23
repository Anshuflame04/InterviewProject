import {
    CheckCircle2,
    Mic2,
    Radio,
} from "lucide-react";

type TranscriptPanelProps = {
    transcript: string;
    interimTranscript: string;
    listening: boolean;
    speaking: boolean;
};

export default function TranscriptPanel({
    transcript,
    interimTranscript,
    listening,
    speaking,
}: TranscriptPanelProps) {
    const hasContent = Boolean(transcript || interimTranscript);

    return (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/10">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2">
                    <div
                        className={`grid h-7 w-7 place-items-center rounded-lg ${listening
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-white/[0.04] text-slate-600"
                            }`}
                    >
                        <Mic2 size={14} />
                    </div>

                    <div>
                        <p className="text-[11px] font-medium text-slate-300">
                            Live transcript
                        </p>

                        <p className="text-[10px] text-slate-600">
                            {speaking
                                ? "Interviewer is speaking"
                                : listening
                                    ? "Listening to you"
                                    : "Ready"}
                        </p>
                    </div>
                </div>

                {listening && (
                    <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.05] px-2.5 py-1 text-[9px] font-medium text-emerald-400">
                        <Radio size={10} className="animate-pulse" />
                        LIVE
                    </div>
                )}
            </div>

            <div className="min-h-44 p-4 sm:min-h-52">
                {!hasContent ? (
                    <div className="flex min-h-36 flex-col items-center justify-center text-center">
                        <Mic2 size={20} className="text-slate-800" />
                        <p className="mt-3 text-xs text-slate-600">
                            Your answer will appear here in real time.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transcript && (
                            <div className="flex gap-2.5">
                                <CheckCircle2
                                    size={15}
                                    className="mt-1 shrink-0 text-emerald-500"
                                />
                                <p className="text-sm leading-7 text-slate-200">
                                    {transcript}
                                </p>
                            </div>
                        )}

                        {interimTranscript && (
                            <div className="rounded-xl border border-blue-400/10 bg-blue-500/[0.035] px-3 py-2.5">
                                <p className="text-xs italic leading-6 text-blue-300/70">
                                    {interimTranscript}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}