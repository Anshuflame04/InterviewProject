export type SpeechSynthesisOptions = {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice | null;
    language?: string;
};

type SpeechCallbacks = {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
};

const supported = () =>
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;

export const isSpeechSynthesisSupported = supported;

export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
    if (!supported()) {
        return [];
    }

    return window.speechSynthesis.getVoices();
};

export const getSpeechVoices = getAvailableVoices;

export const selectVoice = (
    voices: SpeechSynthesisVoice[],
    preferredLanguage?: string,
): SpeechSynthesisVoice | null => {
    if (voices.length === 0) {
        return null;
    }

    if (preferredLanguage) {
        const language = preferredLanguage.toLowerCase();

        const exact = voices.find(
            (voice) =>
                voice.lang.toLowerCase() === language,
        );

        if (exact) {
            return exact;
        }

        const baseLanguage = language.split("-")[0];

        const sameLanguage = voices.find(
            (voice) =>
                voice.lang
                    .toLowerCase()
                    .startsWith(baseLanguage),
        );

        if (sameLanguage) {
            return sameLanguage;
        }
    }

    return (
        voices.find((voice) =>
            voice.lang
                .toLowerCase()
                .startsWith("en"),
        ) || voices[0]
    );
};

export const isSpeaking = () =>
    supported() &&
    (
        window.speechSynthesis.speaking ||
        window.speechSynthesis.pending
    );

export const isSpeechSpeaking = isSpeaking;

let speechRequestId = 0;

export const stopSpeaking = () => {
    if (!supported()) {
        return;
    }

    /*
     * Invalidate the current speech request before cancelling it.
     * Chrome may emit "interrupted" when cancel() is called.
     */
    speechRequestId += 1;

    window.speechSynthesis.cancel();
};

export const pauseSpeaking = () => {
    if (
        supported() &&
        window.speechSynthesis.speaking
    ) {
        window.speechSynthesis.pause();
    }
};

export const resumeSpeaking = () => {
    if (
        supported() &&
        window.speechSynthesis.paused
    ) {
        window.speechSynthesis.resume();
    }
};

export const speakText = (
    text: string,
    options: SpeechSynthesisOptions = {},
    callbacks: SpeechCallbacks = {},
) => {
    if (!supported()) {
        callbacks.onError?.(
            new Error(
                "Speech synthesis is not supported by this browser.",
            ),
        );

        return;
    }

    const value = text.trim();

    if (!value) {
        callbacks.onEnd?.();
        return;
    }

    const requestId = ++speechRequestId;

    /*
     * Cancel any previous utterance.
     * Its callbacks are ignored because its requestId is stale.
     */
    window.speechSynthesis.cancel();

    const startSpeech = () => {
        if (requestId !== speechRequestId) {
            return;
        }

        const utterance =
            new SpeechSynthesisUtterance(value);

        utterance.rate = options.rate ?? 0.95;
        utterance.pitch = options.pitch ?? 1;
        utterance.volume = options.volume ?? 1;

        if (options.language) {
            utterance.lang = options.language;
        }

        const voices =
            getAvailableVoices();

        const voice =
            options.voice ||
            selectVoice(
                voices,
                options.language,
            );

        if (voice) {
            utterance.voice = voice;
        }

        utterance.onstart = () => {
            if (requestId !== speechRequestId) {
                return;
            }

            callbacks.onStart?.();
        };

        utterance.onend = () => {
            if (requestId !== speechRequestId) {
                return;
            }

            callbacks.onEnd?.();
        };

        utterance.onerror = (event) => {
            /*
             * Ignore callbacks from older/cancelled requests.
             */
            if (requestId !== speechRequestId) {
                return;
            }

            /*
             * Chrome uses these errors when an utterance is
             * intentionally cancelled.
             */
            if (
                event.error === "interrupted" ||
                event.error === "canceled"
            ) {
                callbacks.onEnd?.();
                return;
            }

            callbacks.onError?.(
                new Error(
                    `Speech synthesis failed: ${event.error || "unknown"
                    }`,
                ),
            );
        };

        window.speechSynthesis.speak(
            utterance,
        );
    };

    /*
     * Give Chrome a small amount of time to finish clearing
     * the previous cancelled utterance.
     */
    window.setTimeout(
        startSpeech,
        50,
    );
};