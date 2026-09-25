import {
    AlertCircle,
    HelpCircle,
    Loader2,
    RotateCcw,
    Sparkles,
    Volume2,
} from "lucide-react";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import InterviewControls from "../components/interview/InterviewControls";
import InterviewHeader from "../components/interview/InterviewHeader";
import InterviewerPanel from "../components/interview/InterviewerPanel";
import TranscriptPanel from "../components/interview/TranscriptPanel";
import { useInterview } from "../hooks/useInterview";
import { useMediaDevices } from "../hooks/useMediaDevices";
import { useSpeech } from "../hooks/useSpeech";
import { api } from "../services/api";

export default function Interview() {
    const location = useLocation();
    const navigate = useNavigate();

    const locationState =
        location.state as {
            interviewId?: string;
        } | null;

    const queryParams =
        new URLSearchParams(
            location.search,
        );

    const interviewId =
        locationState?.interviewId ||
        queryParams.get(
            "interviewId",
        ) ||
        queryParams.get("id") ||
        "";

    const {
        question,
        totalQuestions,
        questionIndex,
        isLastQuestion,
        llmModel,
        status,
        error: interviewError,
        submitAndNext,
        retry,
    } = useInterview(
        interviewId || undefined,
    );

    const {
        stream,
        cameraEnabled,
        microphoneEnabled,
        error: mediaError,
        requestAccess,
        toggleCamera,
        toggleMicrophone,
        stopStream,
    } = useMediaDevices();

    const {
        isListening,
        isSpeaking,
        transcript,
        interimTranscript,
        speak,
        stopSpeaking,
        startListening,
        stopListening,
        clearTranscript,
    } = useSpeech();

    const [
        voiceEnabled,
        setVoiceEnabled,
    ] = useState(true);

    const [
        elapsedSeconds,
        setElapsedSeconds,
    ] = useState(0);

    const [
        typedAnswer,
        setTypedAnswer,
    ] = useState("");

    const [
        isTextMode,
        setIsTextMode,
    ] = useState(false);

    const videoRef =
        useRef<HTMLVideoElement | null>(
            null,
        );

    /*
     * Initialize camera + microphone once.
     *
     * Do NOT call stopSpeaking/stopListening from
     * this effect. They are separate from media lifecycle.
     */
    useEffect(() => {
        void requestAccess();

        return () => {
            stopStream();
        };
    }, [requestAccess, stopStream]);

    /*
     * Attach webcam stream.
     */
    useEffect(() => {
        if (
            videoRef.current &&
            stream
        ) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play().catch(() => {
                // `playsInline` permits autoplay; browsers may still defer it
                // until the user interacts with the page.
            });
        }
    }, [stream]);

    /*
     * Interview timer.
     */
    useEffect(() => {
        if (
            status === "completed" ||
            !interviewId
        ) {
            return;
        }

        const timer =
            window.setInterval(() => {
                setElapsedSeconds(
                    (value) =>
                        value + 1,
                );
            }, 1000);

        return () =>
            window.clearInterval(
                timer,
            );
    }, [
        status,
        interviewId,
    ]);

    /*
     * Speak each new question.
     *
     * useSpeech() now keeps `speak` stable, so this
     * effect won't rerun just because the browser
     * loaded a voice.
     */
    /*
     * Speak each new question.
     * When speech finishes (or immediately if muted), automatically open the microphone!
     */
    const spokenQuestionRef = useRef<string | null>(null);

    useEffect(() => {
        if (!question?.question) {
            return;
        }

        if (spokenQuestionRef.current === question.question) {
            return;
        }
        spokenQuestionRef.current = question.question;

        if (voiceEnabled) {
            speak(question.question, {
                onEnd: () => {
                    void startListening();
                },
            });
        } else {
            void startListening();
        }
    }, [
        question?.question,
        voiceEnabled,
        speak,
        startListening,
    ]);

    const currentAnswer = [
        typedAnswer.trim(),
        transcript.trim(),
        interimTranscript.trim(),
    ]
        .filter(Boolean)
        .join(" ")
        .trim();

    const canSubmit =
        currentAnswer.length > 0 &&
        status === "ready";

    const handleSubmitAnswer =
        async () => {
            if (!canSubmit) {
                return;
            }

            stopSpeaking();

            if (isListening) {
                stopListening();
            }

            const answerToSend = currentAnswer;

            try {
                const res = await submitAndNext(
                    answerToSend,
                    elapsedSeconds,
                );

                clearTranscript();
                setTypedAnswer("");
                setIsTextMode(false);

                if (res.completed) {
                    api.invalidate("/analytics/");
                    stopStream();
                    navigate("/results", {
                        state: {
                            interviewId,
                            elapsedSeconds,
                        },
                    });
                }
            } catch {
                // useInterview handles the error state.
            }
        };

    const handleToggleMicrophone = async () => {
        if (isListening) {
            stopListening();
            if (microphoneEnabled) toggleMicrophone();
            return;
        }

        /*
        * Make sure the hardware microphone track is enabled.
        * SpeechRecognition uses the browser microphone separately.
        */
        if (!microphoneEnabled) {
            toggleMicrophone();
        }

        await startListening({ continuous: true, interimResults: true, autoRestart: true });
    };

    const handleToggleCamera = async () => {
        if (!stream || stream.getVideoTracks().length === 0) {
            const granted = await requestAccess();
            if (granted) return;
        }
        toggleCamera();
    };

    const handleToggleVoice = () => {
        setVoiceEnabled(
            (enabled) => {
                const next =
                    !enabled;

                if (!next) {
                    stopSpeaking();
                } else if (
                    question?.question
                ) {
                    speak(
                        question.question,
                    );
                }

                return next;
            },
        );
    };

    if (!interviewId) {
        return (
            <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-400">
                    <HelpCircle size={32} />
                </div>

                <h2 className="text-2xl font-bold text-white">
                    No Active Interview
                </h2>

                <p className="mt-2 max-w-md text-sm text-slate-400">
                    Start an interview from the interview setup page.
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate(
                            "/interview/setup",
                        )
                    }
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-400"
                >
                    <Sparkles size={16} />
                    Set Up Interview
                </button>
            </div>
        );
    }

    if (
        status === "error" &&
        !question
    ) {
        return (
            <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
                <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-400">
                    <AlertCircle size={32} />
                </div>

                <h2 className="text-2xl font-bold text-white">
                    Unable to Load Interview
                </h2>

                <p className="mt-2 max-w-md text-sm text-rose-300/80">
                    {interviewError ||
                        "Failed to load the interview session."}
                </p>

                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={
                            retry
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                        <RotateCcw
                            size={16}
                        />
                        Retry
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/dashboard",
                            )
                        }
                        className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-400"
                    >
                        Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (
        status === "loading" &&
        !question
    ) {
        return (
            <div className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
                <Loader2
                    size={40}
                    className="animate-spin text-cyan-400"
                />

                <h3 className="mt-4 text-lg font-semibold text-white">
                    Preparing Your Interview...
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                    Loading your personalized questions.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#07111f] pb-16 text-white">
            <InterviewHeader
                currentQuestion={
                    questionIndex + 1
                }
                totalQuestions={
                    totalQuestions || 1
                }
                elapsedSeconds={
                    elapsedSeconds
                }
                title="InterviewYou Technical Interview"
                llmModel={llmModel}
            />

            <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,0.8fr)_minmax(440px,1.55fr)_minmax(220px,0.8fr)] xl:items-start">
                    <aside className="xl:sticky xl:top-6">
                        <InterviewerPanel
                            isSpeaking={
                                isSpeaking
                            }
                            isMuted={
                                !voiceEnabled
                            }
                            onToggleMute={
                                handleToggleVoice
                            }
                        />
                    </aside>

                    <section className="space-y-5">
                        {question && (
                            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl sm:p-6">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                                            Question{" "}
                                            {questionIndex +
                                                1}
                                            {totalQuestions
                                                ? ` of ${totalQuestions}`
                                                : ""}
                                        </span>

                                        {question.difficulty && (
                                            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs capitalize text-slate-300">
                                                {
                                                    question.difficulty
                                                }
                                            </span>
                                        )}

                                        {question.topic && (
                                            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-400">
                                                {
                                                    question.topic
                                                }
                                            </span>
                                        )}

                                        {question.is_follow_up && (
                                            <span className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300">
                                                Follow-up
                                            </span>
                                        )}
                                    </div>

                                    {voiceEnabled && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                speak(
                                                    question.question,
                                                )
                                            }
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                                        >
                                            <Volume2
                                                size={14}
                                            />
                                            Repeat
                                        </button>
                                    )}
                                </div>

                                <h2 className="text-lg font-medium leading-relaxed text-slate-100 sm:text-xl">
                                    {
                                        question.question
                                    }
                                </h2>
                            </div>
                        )}

                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-white">Your Response</h3>
                                <button type="button" onClick={() => setIsTextMode((value) => !value)} className="text-xs text-cyan-400 hover:text-cyan-300">
                                    {isTextMode ? "Hide Text Input" : "Type Response"}
                                </button>
                            </div>
                            <TranscriptPanel transcript={transcript} interimTranscript={interimTranscript} listening={isListening} speaking={isSpeaking} />
                            {isTextMode && (
                                <textarea rows={5} value={typedAnswer} onChange={(event) => setTypedAnswer(event.target.value)} placeholder="Type your response..." disabled={status === "submitting"} className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-400 disabled:opacity-50" />
                            )}
                            <InterviewControls cameraEnabled={cameraEnabled} microphoneEnabled={microphoneEnabled} voiceEnabled={voiceEnabled} canSubmit={canSubmit} submitting={status === "submitting"} isLastQuestion={isLastQuestion} onToggleCamera={handleToggleCamera} onToggleMicrophone={handleToggleMicrophone} onToggleVoice={handleToggleVoice} onSubmit={handleSubmitAnswer} />
                        </div>
                    </section>

                    <aside className="xl:sticky xl:top-6">
                        <div className="relative min-h-[420px] overflow-hidden rounded-3xl border border-white/[0.07] bg-slate-950 shadow-xl">
                            {cameraEnabled &&
                                stream ? (
                                <video
                                    ref={
                                        videoRef
                                    }
                                    autoPlay
                                    playsInline
                                    muted
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full flex-col items-center justify-center bg-slate-900/90 p-4 text-center">
                                    <p className="text-xs font-medium text-slate-400">Camera is off</p>

                                    <p className="mt-1 text-[11px] text-slate-600">
                                        {mediaError || "Enable it from the controls below."}
                                    </p>
                                    <button type="button" onClick={() => void requestAccess()} className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-400/15">Enable camera</button>
                                </div>
                            )}

                            <div className="absolute left-3 top-3">
                                <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium backdrop-blur">
                                    <span
                                        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${microphoneEnabled
                                            ? "animate-pulse bg-emerald-400"
                                            : "bg-slate-500"
                                            }`}
                                    />

                                    {microphoneEnabled
                                        ? "Mic On"
                                        : "Muted"}
                                </span>
                            </div>
                        </div>

                    </aside>
                </div>
            </main>
        </div>
    );
}
