export type LlmProvider = "gemini" | "groq";

export type LlmSettings = {
    provider: LlmProvider;
    model: string;
    apiKey: string;
};

export type LlmSettingsByProvider = Partial<Record<LlmProvider, LlmSettings>>;

const STORAGE_KEY = "ai-interview.llm-settings";
const ACTIVE_PROVIDER_KEY = "ai-interview.active-llm-provider";

export const LLM_MODELS = {
    gemini: [
        { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash — fast, balanced" },
    ],
    groq: [
        { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B — fastest" },
        { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B — strongest reasoning" },
        { id: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B — structured output" },
    ],
} as const;

export const getLlmSettingsByProvider = (): LlmSettingsByProvider => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const value = JSON.parse(raw) as Partial<LlmSettings> | LlmSettingsByProvider;

        // Migrate the previous single-provider format without losing a key.
        if ("provider" in value && value.provider && value.model && value.apiKey) {
            return { [value.provider]: value as LlmSettings };
        }

        return value as LlmSettingsByProvider;
    } catch {
        return {};
    }
};

export const getLlmSettings = (): LlmSettings | null => {
    const saved = getLlmSettingsByProvider();
    const active = localStorage.getItem(ACTIVE_PROVIDER_KEY) as LlmProvider | null;
    return (active && saved[active]) ?? saved.gemini ?? saved.groq ?? null;
};

export const getLlmSettingsForProvider = (provider: LlmProvider): LlmSettings | null =>
    getLlmSettingsByProvider()[provider] ?? null;

export const saveLlmSettings = (settings: LlmSettings) => {
    const saved = getLlmSettingsByProvider();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, [settings.provider]: settings }));
    localStorage.setItem(ACTIVE_PROVIDER_KEY, settings.provider);
};
export const clearLlmSettings = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_PROVIDER_KEY);
};
