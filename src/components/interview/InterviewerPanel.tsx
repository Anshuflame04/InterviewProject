// src/components/interview/InterviewerPanel.tsx

import {
    Volume2,
    VolumeX,
} from "lucide-react";

import interviewerImage from "../../assets/interviewer.png";

interface InterviewerPanelProps {
    isSpeaking: boolean;
    isMuted?: boolean;
    onToggleMute?: () => void;
}

/**
 * Visual state for the AI interviewer.
 *
 * Eventually this can be expanded into:
 * - animated avatar
 * - lip-sync
 * - voice waveform
 * - speaking indicator
 */
export default function InterviewerPanel({
    isSpeaking,
    isMuted = false,
    onToggleMute,
}: InterviewerPanelProps) {
    return (
        <section
            className="
        relative
        overflow-hidden
        rounded-3xl
        border border-white/[0.07]
        bg-gradient-to-br
        from-blue-500/[0.08]
        via-white/[0.025]
        to-cyan-400/[0.04]
      "
        >
            {/* Background glow */}

            <div
                className={`
          pointer-events-none
          absolute
          left-1/2 top-1/2
          h-72 w-72
          -translate-x-1/2
          -translate-y-1/2
          rounded-full
          blur-3xl
          transition-all
          duration-700

          ${isSpeaking
                        ? "bg-blue-500/20 scale-110"
                        : "bg-blue-500/5 scale-90"
                    }
        `}
            />

            <div
                className="
          relative
          flex
          min-h-[420px]
          flex-col
          items-center
          justify-center
          p-6
          sm:p-8
        "
            >
                {/* Status */}

                <div
                    className={`
            mb-7
            inline-flex
            items-center
            gap-2
            rounded-full
            border
            px-3
            py-1.5
            text-[11px]
            font-medium
            transition

            ${isSpeaking
                            ? `
                  border-blue-400/20
                  bg-blue-500/10
                  text-blue-300
                `
                            : `
                  border-white/[0.07]
                  bg-white/[0.025]
                  text-slate-500
                `
                        }
          `}
                >
                    <span
                        className={`
              h-1.5
              w-1.5
              rounded-full

              ${isSpeaking
                                ? `
                    bg-blue-400
                    shadow-[0_0_10px_rgba(96,165,250,0.8)]
                  `
                                : "bg-slate-600"
                            }
            `}
                    />

                    {isSpeaking
                        ? "Interviewer is speaking"
                        : "InterviewYou Coach"}
                </div>

                {/* Avatar */}

                <div className="relative">
                    {isSpeaking && (
                        <>
                            <div
                                className="
                  absolute
                  -inset-5
                  rounded-[2rem]
                  border
                  border-blue-400/10
                  animate-pulse
                "
                            />

                            <div
                                className="
                  absolute
                  -inset-10
                  rounded-[2.5rem]
                  border
                  border-blue-400/[0.04]
                "
                            />
                        </>
                    )}

                    <div
                        className="
              relative
              h-52
              w-52
              overflow-hidden
              rounded-[2rem]
              border
              border-white/10
              bg-slate-900
              shadow-2xl
              shadow-blue-950/40
              sm:h-60
              sm:w-60
            "
                    >
                        <img
                            src={interviewerImage}
                            alt="AI interviewer"
                            className="
                h-full
                w-full
                object-cover
              "
                        />
                    </div>
                </div>

                {/* Name */}

                <div className="mt-7 text-center">
                    <h2 className="text-base font-semibold text-white">
                        InterviewYou Coach
                    </h2>

                    <p className="mt-1 text-xs text-slate-600">
                        {isSpeaking
                            ? "Speaking"
                            : "Listening for your answer"}
                    </p>
                </div>

                {/* Voice control */}

                {onToggleMute && (
                    <button
                        type="button"
                        onClick={onToggleMute}
                        className="
              absolute
              bottom-5
              right-5
              rounded-xl
              border border-white/[0.08]
              bg-black/20
              p-2.5
              text-slate-400
              transition
              hover:bg-white/[0.06]
              hover:text-slate-200
            "
                        aria-label={
                            isMuted
                                ? "Enable interviewer voice"
                                : "Mute interviewer voice"
                        }
                    >
                        {isMuted ? (
                            <VolumeX size={17} />
                        ) : (
                            <Volume2 size={17} />
                        )}
                    </button>
                )}
            </div>
        </section>
    );
}
