import {
    ArrowRight,
    CheckCircle2,
    Mic,
    MicOff,
    PhoneOff,
    Video,
    VideoOff,
    Volume2,
    VolumeX,
} from "lucide-react";

type InterviewControlsProps = {
    cameraEnabled: boolean;
    microphoneEnabled: boolean;
    voiceEnabled: boolean;
    canSubmit: boolean;
    submitting: boolean;
    isLastQuestion?: boolean;

    onToggleCamera: () => void;
    onToggleMicrophone: () => void;
    onToggleVoice: () => void;
    onSubmit: () => void;
    onEndInterview?: () => void;
};

export default function InterviewControls({
    cameraEnabled,
    microphoneEnabled,
    voiceEnabled,
    canSubmit,
    submitting,
    isLastQuestion = false,
    onToggleCamera,
    onToggleMicrophone,
    onToggleVoice,
    onSubmit,
    onEndInterview,
}: InterviewControlsProps) {
    return (
        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
                <ControlButton
                    label={
                        cameraEnabled
                            ? "Turn camera off"
                            : "Turn camera on"
                    }
                    active={cameraEnabled}
                    onClick={
                        onToggleCamera
                    }
                    icon={
                        cameraEnabled ? (
                            <Video size={17} />
                        ) : (
                            <VideoOff size={17} />
                        )
                    }
                />

                <ControlButton
                    label={
                        microphoneEnabled
                            ? "Turn microphone off"
                            : "Turn microphone on"
                    }
                    active={microphoneEnabled}
                    onClick={
                        onToggleMicrophone
                    }
                    icon={
                        microphoneEnabled ? (
                            <Mic size={17} />
                        ) : (
                            <MicOff size={17} />
                        )
                    }
                />

                <ControlButton
                    label={
                        voiceEnabled
                            ? "Mute interviewer"
                            : "Enable interviewer voice"
                    }
                    active={voiceEnabled}
                    onClick={
                        onToggleVoice
                    }
                    icon={
                        voiceEnabled ? (
                            <Volume2 size={17} />
                        ) : (
                            <VolumeX size={17} />
                        )
                    }
                />
            </div>

            <div className="flex items-center gap-2">
                {onEndInterview && (
                    <button
                        type="button"
                        onClick={
                            onEndInterview
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-400/15 bg-rose-500/[0.06] px-3.5 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                    >
                        <PhoneOff size={15} />
                        End
                    </button>
                )}

                <button
                    type="button"
                    onClick={onSubmit}
                    disabled={
                        !canSubmit ||
                        submitting
                    }
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        isLastQuestion
                            ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:from-emerald-300 hover:to-cyan-300 shadow-lg shadow-cyan-500/20"
                            : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    }`}
                >
                    {isLastQuestion ? (
                        <CheckCircle2 size={15} />
                    ) : (
                        <ArrowRight size={15} />
                    )}
                    {submitting
                        ? (isLastQuestion ? "Submitting Interview..." : "Loading Next...")
                        : (isLastQuestion ? "Submit Interview" : "Next Question")}
                </button>
            </div>
        </div>
    );
}

function ControlButton({
    icon,
    label,
    active,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={`rounded-xl border p-2.5 transition ${active
                    ? "border-white/[0.08] bg-white/[0.025] text-slate-300 hover:bg-white/[0.06]"
                    : "border-rose-400/15 bg-rose-500/[0.06] text-rose-300 hover:bg-rose-500/10"
                }`}
        >
            {icon}
        </button>
    );
}
