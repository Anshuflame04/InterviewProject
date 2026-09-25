import { useCallback, useEffect, useRef, useState } from "react";

import {
    getAvailableVoices,
    isSpeaking,
    isSpeechSynthesisSupported,
    pauseSpeaking,
    resumeSpeaking,
    selectVoice,
    speakText,
    stopSpeaking,
    type SpeechSynthesisOptions,
} from "../services/speech/speechSynthesis";

import {
    isSpeechRecognitionSupported,
    SpeechRecognitionSession,
    type RecognitionOptions,
} from "../services/speech/speechRecognition";

export type SpeechStatus =
    | "idle"
    | "speaking"
    | "listening"
    | "error";

export interface UseSpeechOptions {
    language?: string;
    preferLocalRecognition?: boolean;
    contextualPhrases?: string[];
}

export function useSpeech(options: UseSpeechOptions = {}) {
    const language = options.language ?? "en-US";

    const recognitionRef = useRef<SpeechRecognitionSession | null>(null);

    const [status, setStatus] = useState<SpeechStatus>("idle");
    const [isListening, setIsListening] = useState(false);
    const [isSpeakingState, setIsSpeakingState] = useState(false);

    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");

    const [error, setError] = useState<string | null>(null);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoice, setSelectedVoice] =
        useState<SpeechSynthesisVoice | null>(null);

    useEffect(() => {
        if (!isSpeechSynthesisSupported()) return;

        const loadVoices = () => {
            const available = getAvailableVoices();

            setVoices(available);

            setSelectedVoice((current) => {
                if (current) return current;
                return selectVoice(available, language);
            });
        };

        loadVoices();
        window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

        return () => {
            window.speechSynthesis.removeEventListener(
                "voiceschanged",
                loadVoices,
            );
        };
    }, [language]);

    const speak = useCallback(
        (
            text: string,
            speechOptions: Partial<SpeechSynthesisOptions> & {
                onEnd?: () => void;
                onStart?: () => void;
                onError?: (error: Error) => void;
            } = {},
        ) => {
            const value = text.trim();
            if (!value) {
                speechOptions.onEnd?.();
                return;
            }

            setError(null);

            if (!isSpeechSynthesisSupported()) {
                setError("Text-to-speech is not supported in this browser.");
                setStatus("error");
                speechOptions.onEnd?.();
                return;
            }

            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
                setIsListening(false);
            }

            stopSpeaking();

            speakText(
                value,
                {
                    language,
                    voice: speechOptions.voice ?? selectedVoice,
                    rate: speechOptions.rate ?? 0.95,
                    pitch: speechOptions.pitch ?? 1,
                    volume: speechOptions.volume ?? 1,
                    ...speechOptions,
                },
                {
                    onStart: () => {
                        setIsSpeakingState(true);
                        setStatus("speaking");
                        speechOptions.onStart?.();
                    },
                    onEnd: () => {
                        setIsSpeakingState(false);
                        setStatus("idle");
                        speechOptions.onEnd?.();
                    },
                    onError: (speechError) => {
                        console.error(
                            "Speech synthesis error:",
                            speechError,
                        );

                        setIsSpeakingState(false);
                        setStatus("error");
                        setError(
                            "The interviewer voice could not be played.",
                        );
                        speechOptions.onError?.(speechError);
                        speechOptions.onEnd?.();
                    },
                },
            );
        },
        [language, selectedVoice],
    );

    const stopSpeakingHandler = useCallback(() => {
        stopSpeaking();
        setIsSpeakingState(false);
        setStatus(isListening ? "listening" : "idle");
    }, [isListening]);

    const pauseSpeakingHandler = useCallback(() => {
        pauseSpeaking();
    }, []);

    const resumeSpeakingHandler = useCallback(() => {
        resumeSpeaking();
    }, []);

    const startListening = useCallback(
        async (
            recognitionOptions: Partial<RecognitionOptions> = {},
        ) => {
            setError(null);
            // NOTE: We do NOT reset transcript here — let the caller
            // clear it explicitly via clearTranscript() when they
            // actually want to start fresh (e.g. next question).

            if (!isSpeechRecognitionSupported()) {
                setError(
                    "Speech recognition is not supported in this browser.",
                );
                setStatus("error");
                return false;
            }

            stopSpeaking();

            recognitionRef.current?.stop();

            const session = new SpeechRecognitionSession();
            recognitionRef.current = session;

            try {
                await session.start(
                    {
                        onStart: () => {
                            setIsListening(true);
                            setStatus("listening");
                        },

                        onInterimResult: (text) => {
                            setInterimTranscript(text);
                        },

                        onFinalResult: (text) => {
                            setTranscript((current) => {
                                if (!current) return text.trim();

                                return `${current} ${text.trim()}`.trim();
                            });

                            setInterimTranscript("");
                        },

                        onError: (recognitionError) => {
                            console.error(
                                "Speech recognition error:",
                                recognitionError,
                            );

                            if (
                                recognitionError.error === "not-allowed"
                            ) {
                                session.stop();
                                recognitionRef.current = null;
                                setIsListening(false);
                                setStatus("error");
                                setError(
                                    "Microphone permission was denied.",
                                );
                                return;
                            }

                            if (
                                recognitionError.error ===
                                "service-not-allowed"
                            ) {
                                session.stop();
                                recognitionRef.current = null;
                                setIsListening(false);
                                setStatus("error");
                                setError(
                                    "The browser speech recognition service is unavailable.",
                                );
                                return;
                            }

                            // "no-speech" and "network" are transient browser
                            // segment events. SpeechRecognitionSession recreates
                            // the segment automatically, so do not interrupt an
                            // otherwise active long-form answer with an error.
                            if (![
                                "no-speech",
                                "network",
                            ].includes(recognitionError.error)) {
                                setError(`Speech recognition error: ${recognitionError.error}`);
                            }
                        },

                        onEnd: () => {
                            // SpeechRecognitionSession handles auto-restart.
                        },
                    },
                    {
                        language,
                        continuous:
                            recognitionOptions.continuous ?? true,
                        interimResults:
                            recognitionOptions.interimResults ?? true,
                        preferLocal:
                            recognitionOptions.preferLocal ??
                            options.preferLocalRecognition ??
                            true,
                        contextualPhrases:
                            recognitionOptions.contextualPhrases ??
                            options.contextualPhrases ??
                            [],
                        autoRestart:
                            recognitionOptions.autoRestart ?? true,
                    },
                );

                return true;
            } catch (recognitionError) {
                console.error(
                    "Could not start speech recognition:",
                    recognitionError,
                );

                recognitionRef.current = null;
                setIsListening(false);
                setStatus("error");

                setError(
                    recognitionError instanceof Error
                        ? recognitionError.message
                        : "Could not start speech recognition.",
                );

                return false;
            }
        },
        [
            language,
            options.contextualPhrases,
            options.preferLocalRecognition,
        ],
    );

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;

        setIsListening(false);
        setInterimTranscript("");

        setStatus(isSpeakingState ? "speaking" : "idle");
    }, [isSpeakingState]);

    const abortListening = useCallback(() => {
        recognitionRef.current?.abort();
        recognitionRef.current = null;

        setIsListening(false);
        setInterimTranscript("");

        setStatus(isSpeakingState ? "speaking" : "idle");
    }, [isSpeakingState]);

    const chooseVoice = useCallback((voice: SpeechSynthesisVoice) => {
        setSelectedVoice(voice);
    }, []);

    const clearTranscript = useCallback(() => {
        setTranscript("");
        setInterimTranscript("");
    }, []);

    const clearError = useCallback(() => {
        setError(null);
        setStatus((current) =>
            current === "error" ? "idle" : current,
        );
    }, []);

    useEffect(() => {
        return () => {
            recognitionRef.current?.abort();
            recognitionRef.current = null;
            stopSpeaking();
        };
    }, []);

    return {
        status,
        isListening,
        isSpeaking: isSpeakingState || isSpeaking(),

        transcript,
        interimTranscript,
        error,

        voices,
        selectedVoice,

        speechRecognitionSupported:
            isSpeechRecognitionSupported(),
        speechSynthesisSupported:
            isSpeechSynthesisSupported(),

        speak,
        stopSpeaking: stopSpeakingHandler,
        pauseSpeaking: pauseSpeakingHandler,
        resumeSpeaking: resumeSpeakingHandler,
        chooseVoice,

        startListening,
        stopListening,
        abortListening,

        clearTranscript,
        clearError,
    };
}
