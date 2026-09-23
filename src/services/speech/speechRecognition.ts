type SpeechRecognitionResultEventLike = {
    resultIndex: number;
    results: SpeechRecognitionResultList;
};

type RecognitionCallbacks = {
    onStart?: () => void;
    onEnd?: () => void;
    onInterimResult?: (text: string) => void;
    onFinalResult?: (text: string) => void;
    onError?: (error: { error: string }) => void;
};

export type RecognitionOptions = {
    language?: string;
    continuous?: boolean;
    interimResults?: boolean;
    autoRestart?: boolean;

    /*
     * Accepted for compatibility with useSpeech().
     * Browser support varies, so the service safely ignores them.
     */
    preferLocal?: boolean;
    contextualPhrases?: string[];
};

type SpeechRecognitionInstance = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;

    start: () => void;
    stop: () => void;
    abort: () => void;

    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror:
    ((event: { error: string }) => void) | null;

    onresult:
    ((event: SpeechRecognitionResultEventLike) => void) | null;
};

type SpeechRecognitionConstructor =
    new () => SpeechRecognitionInstance;

const getConstructor =
    (): SpeechRecognitionConstructor | null => {
        if (typeof window === "undefined") {
            return null;
        }

        const browserWindow =
            window as typeof window & {
                SpeechRecognition?: SpeechRecognitionConstructor;
                webkitSpeechRecognition?: SpeechRecognitionConstructor;
            };

        return (
            browserWindow.SpeechRecognition ??
            browserWindow.webkitSpeechRecognition ??
            null
        );
    };

export const isSpeechRecognitionSupported =
    () => getConstructor() !== null;

export class SpeechRecognitionSession {
    private recognition:
        SpeechRecognitionInstance | null = null;

    private options: RecognitionOptions = {};

    private callbacks: RecognitionCallbacks = {};

    private stoppedManually = false;

    private restartAttempts = 0;

    start(
        callbacks: RecognitionCallbacks,
        options: RecognitionOptions = {},
    ): Promise<void> {
        return new Promise(
            (resolve, reject) => {
                const Constructor =
                    getConstructor();

                if (!Constructor) {
                    callbacks.onError?.({
                        error: "not-supported",
                    });

                    reject(
                        new Error(
                            "Speech recognition is not supported in this browser.",
                        ),
                    );

                    return;
                }

                /*
                 * Stop any previous session.
                 */
                this.abort();

                this.callbacks = callbacks;

                this.options = {
                    language: "en-US",
                    continuous: true,
                    interimResults: true,
                    autoRestart: true,
                    ...options,
                };

                this.stoppedManually = false;

                let started = false;
                let settled = false;

                const recognition =
                    new Constructor();

                recognition.lang =
                    this.options.language ??
                    "en-US";

                recognition.continuous =
                    this.options.continuous ??
                    true;

                recognition.interimResults =
                    this.options.interimResults ??
                    true;

                recognition.maxAlternatives = 1;

                recognition.onstart = () => {
                    started = true;
                    this.restartAttempts = 0;

                    if (!settled) {
                        settled = true;
                        resolve();
                    }

                    this.callbacks.onStart?.();
                };

                recognition.onresult = (
                    event,
                ) => {
                    let finalText = "";
                    let interimText = "";

                    for (
                        let i =
                            event.resultIndex;
                        i <
                        event.results.length;
                        i++
                    ) {
                        const result =
                            event.results[i];

                        const text =
                            result[0]
                                ?.transcript ??
                            "";

                        if (
                            result.isFinal
                        ) {
                            finalText += text;
                        } else {
                            interimText += text;
                        }
                    }

                    if (
                        interimText.trim()
                    ) {
                        this.callbacks.onInterimResult?.(
                            interimText.trim(),
                        );
                    }

                    if (
                        finalText.trim()
                    ) {
                        this.callbacks.onFinalResult?.(
                            finalText.trim(),
                        );
                    }
                };

                recognition.onerror = (
                    event,
                ) => {
                    if (
                        event.error ===
                        "aborted"
                    ) {
                        return;
                    }

                    this.callbacks.onError?.({
                        error: event.error,
                    });

                    const fatal =
                        event.error ===
                        "not-allowed" ||
                        event.error ===
                        "service-not-allowed" ||
                        event.error ===
                        "not-supported" ||
                        event.error ===
                        "audio-capture";

                    if (fatal) {
                        this.stoppedManually =
                            true;
                    }

                    if (
                        !started &&
                        !settled
                    ) {
                        settled = true;

                        reject(
                            new Error(
                                `Speech recognition error: ${event.error}`,
                            ),
                        );
                    }
                };

                recognition.onend = () => {
                    this.callbacks.onEnd?.();

                    if (
                        !this.stoppedManually &&
                        this.options.autoRestart
                    ) {
                        // Chromium may finish a recognition segment after a
                        // short pause even with `continuous` enabled. Restart
                        // immediately so a longer spoken answer is captured
                        // as one ongoing response instead of being cut off.
                        window.setTimeout(
                            () => {
                                if (
                                    this
                                        .stoppedManually
                                ) {
                                    return;
                                }

                                try {
                                    recognition.start();
                                } catch {
                                    if (this.restartAttempts < 3) {
                                        this.restartAttempts += 1;
                                        window.setTimeout(() => {
                                            if (!this.stoppedManually) {
                                                try {
                                                    recognition.start();
                                                } catch {
                                                    // The next browser end event will retry.
                                                }
                                            }
                                        }, 250 * this.restartAttempts);
                                    }
                                }
                            },
                            0,
                        );
                    }
                };

                this.recognition =
                    recognition;

                try {
                    recognition.start();
                } catch (error) {
                    this.recognition = null;

                    if (!settled) {
                        settled = true;

                        reject(
                            error instanceof Error
                                ? error
                                : new Error(
                                    "Could not start speech recognition.",
                                ),
                        );
                    }
                }
            },
        );
    }

    stop() {
        this.stoppedManually = true;

        try {
            this.recognition?.stop();
        } catch {
            // Ignore browser stop errors.
        }
    }

    abort() {
        this.stoppedManually = true;

        try {
            this.recognition?.abort();
        } catch {
            // Ignore browser abort errors.
        }

        this.recognition = null;
    }
}
