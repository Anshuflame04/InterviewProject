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
    onerror: ((event: { error: string }) => void) | null;
    onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const getConstructor = (): SpeechRecognitionConstructor | null => {
    if (typeof window === "undefined") return null;
    const browserWindow = window as typeof window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
};

export const isSpeechRecognitionSupported = () => getConstructor() !== null;

/**
 * Owns a never-ending chain of browser recognition segments. Chromium may end
 * a supposedly continuous session after silence, a service limit, or a network
 * blip. Recreating the recognition object for every segment is more reliable
 * than calling start() again on an object the browser has just ended.
 */
export class SpeechRecognitionSession {
    private recognition: SpeechRecognitionInstance | null = null;
    private callbacks: RecognitionCallbacks = {};
    private options: RecognitionOptions = {};
    private active = false;
    private generation = 0;
    private restartTimer: number | null = null;
    private restartAttempts = 0;

    start(callbacks: RecognitionCallbacks, options: RecognitionOptions = {}): Promise<void> {
        const Constructor = getConstructor();
        if (!Constructor) {
            callbacks.onError?.({ error: "not-supported" });
            return Promise.reject(new Error("Speech recognition is not supported in this browser."));
        }

        this.abort();
        this.callbacks = callbacks;
        this.options = { language: "en-US", continuous: true, interimResults: true, autoRestart: true, ...options };
        this.active = true;
        this.restartAttempts = 0;
        const generation = ++this.generation;

        return new Promise((resolve, reject) => this.startSegment(Constructor, generation, resolve, reject));
    }

    private startSegment(
        Constructor: SpeechRecognitionConstructor,
        generation: number,
        resolve?: () => void,
        reject?: (reason: Error) => void,
    ) {
        if (!this.active || generation !== this.generation) return;

        const recognition = new Constructor();
        let started = false;
        let segmentInterim = "";
        this.recognition = recognition;
        recognition.lang = this.options.language ?? "en-US";
        recognition.continuous = this.options.continuous ?? true;
        recognition.interimResults = this.options.interimResults ?? true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            if (!this.isCurrent(recognition, generation)) return;
            started = true;
            this.restartAttempts = 0;
            resolve?.();
            this.callbacks.onStart?.();
        };

        recognition.onresult = (event) => {
            if (!this.isCurrent(recognition, generation)) return;
            let finalText = "";
            let interimText = "";
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
                const result = event.results[index];
                const text = result[0]?.transcript?.trim() ?? "";
                if (result.isFinal) finalText += `${text} `;
                else interimText += `${text} `;
            }
            if (finalText.trim()) this.callbacks.onFinalResult?.(finalText.trim());
            segmentInterim = interimText.trim();
            this.callbacks.onInterimResult?.(segmentInterim);
        };

        recognition.onerror = (event) => {
            if (!this.isCurrent(recognition, generation) || event.error === "aborted") return;
            const fatal = ["not-allowed", "service-not-allowed", "audio-capture", "not-supported"].includes(event.error);
            this.callbacks.onError?.({ error: event.error });
            if (fatal) {
                this.active = false;
                if (!started) reject?.(new Error(`Speech recognition error: ${event.error}`));
            }
        };

        recognition.onend = () => {
            if (!this.isCurrent(recognition, generation)) return;
            // Preserve words that were still interim when the browser closed a segment.
            if (segmentInterim) this.callbacks.onFinalResult?.(segmentInterim);
            this.callbacks.onInterimResult?.("");
            this.callbacks.onEnd?.();
            this.recognition = null;
            if (this.active && this.options.autoRestart) this.scheduleRestart(Constructor, generation);
        };

        try {
            recognition.start();
        } catch (error) {
            if (!started) this.scheduleRestart(Constructor, generation, resolve, reject, error);
        }
    }

    private scheduleRestart(Constructor: SpeechRecognitionConstructor, generation: number, resolve?: () => void, reject?: (reason: Error) => void, initialError?: unknown) {
        if (!this.active || generation !== this.generation) return;
        if (this.restartTimer) window.clearTimeout(this.restartTimer);
        this.restartAttempts += 1;
        const delay = Math.min(2000, 150 * 2 ** Math.min(this.restartAttempts, 4));
        this.restartTimer = window.setTimeout(() => {
            this.restartTimer = null;
            this.startSegment(Constructor, generation, resolve, reject);
        }, delay);
        if (initialError && this.restartAttempts === 1) console.warn("Speech recognition segment will retry:", initialError);
    }

    private isCurrent(recognition: SpeechRecognitionInstance, generation: number) {
        return this.active && this.recognition === recognition && this.generation === generation;
    }

    stop() {
        this.active = false;
        if (this.restartTimer) window.clearTimeout(this.restartTimer);
        this.restartTimer = null;
        try { this.recognition?.stop(); } catch { /* browser is already stopping */ }
    }

    abort() {
        this.active = false;
        this.generation += 1;
        if (this.restartTimer) window.clearTimeout(this.restartTimer);
        this.restartTimer = null;
        try { this.recognition?.abort(); } catch { /* no active browser session */ }
        this.recognition = null;
    }
}
