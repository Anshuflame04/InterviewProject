import { auth } from "../firebase";
import { getLlmSettings } from "./llmSettings";

const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8001";

const buildUrl = (path: string) =>
    `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

const readCache = new Map<string, { value: unknown; expiresAt: number }>();

async function request<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const headers = new Headers(options.headers);
    const isFormData = options.body instanceof FormData;

    if (!isFormData) {
        headers.set("Content-Type", "application/json");
    }

    const user = auth.currentUser;

    if (user) {
        const token = await user.getIdToken();
        headers.set("Authorization", `Bearer ${token}`);
    }

    const llmSettings = getLlmSettings();
    if (llmSettings) {
        headers.set("X-LLM-Provider", llmSettings.provider);
        headers.set("X-LLM-Model", llmSettings.model);
        headers.set("X-LLM-API-Key", llmSettings.apiKey);
    }

    const response = await fetch(buildUrl(path), {
        ...options,
        headers,
    });

    const contentType =
        response.headers.get("content-type") || "";

    const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        const message =
            typeof data === "object" &&
                data !== null &&
                "detail" in data
                ? String(
                    (data as { detail?: unknown }).detail ??
                    "Request failed.",
                )
                : typeof data === "string" && data
                    ? data
                    : `Request failed with status ${response.status}.`;

        throw new Error(message);
    }

    return data as T;
}

const path = {
    AUTH_ME: "/auth/me",

    RESUMES: "/resumes",
    UPLOAD_RESUME: "/resumes/upload",
    RESUME: (id: string) => `/resumes/${id}`,

    INTERVIEWS: "/interviews",
    INTERVIEW: (id: string) => `/interviews/${id}`,

    CURRENT_QUESTION: (id: string) =>
        `/questions/${id}/current`,

    QUESTION_HISTORY: (id: string) =>
        `/questions/${id}/history`,

    EVALUATE_ANSWER: "/evaluation/answer",

    ANALYTICS_OVERVIEW: "/analytics/overview",
    ANALYTICS_HISTORY: (limit = 5, offset = 0) =>
        `/analytics/history?limit=${limit}&offset=${offset}`,

    HEALTH: "/health",
};

export const API = path;

export const api = {
    get: <T>(url: string) =>
        request<T>(url, {
            method: "GET",
        }),

    getCached: async <T>(url: string, ttlMs = 30_000) => {
        const cached = readCache.get(url);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.value as T;
        }
        const value = await request<T>(url, { method: "GET" });
        readCache.set(url, { value, expiresAt: Date.now() + ttlMs });
        return value;
    },

    invalidate: (urlPrefix?: string) => {
        if (!urlPrefix) {
            readCache.clear();
            return;
        }
        for (const key of readCache.keys()) {
            if (key.startsWith(urlPrefix)) readCache.delete(key);
        }
    },

    post: <T>(
        url: string,
        body?: unknown,
    ) =>
        request<T>(url, {
            method: "POST",
            body:
                body instanceof FormData
                    ? body
                    : body === undefined
                        ? undefined
                        : JSON.stringify(body),
        }),

    put: <T>(
        url: string,
        body?: unknown,
    ) =>
        request<T>(url, {
            method: "PUT",
            body:
                body instanceof FormData
                    ? body
                    : body === undefined
                        ? undefined
                        : JSON.stringify(body),
        }),

    delete: <T>(url: string) =>
        request<T>(url, {
            method: "DELETE",
        }),
};
