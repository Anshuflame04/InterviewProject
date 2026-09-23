import {
    CheckCircle2,
    FileText,
    Loader2,
    UploadCloud,
    X,
} from "lucide-react";
import {
    type DragEvent,
    useEffect,
    useRef,
    useState,
} from "react";
import { useNavigate } from "react-router-dom";

import PageHeader from "../components/common/PageHeader";
import { api, API } from "../services/api";

type ResumeItem = {
    id?: string;
    resume_id?: string;
    file_name?: string;
    fileName?: string;
    name?: string;
    created_at?: string;
    createdAt?: string;
};

type ResumeResponse =
    | ResumeItem[]
    | {
        resumes?: ResumeItem[];
        items?: ResumeItem[];
        data?: ResumeItem[];
    };

const MAX_FILE_SIZE =
    10 * 1024 * 1024;

const normalizeResumes = (
    response: ResumeResponse,
): ResumeItem[] => {
    if (Array.isArray(response)) {
        return response;
    }

    return (
        response.resumes ??
        response.items ??
        response.data ??
        []
    );
};

const getResumeId = (
    resume: ResumeItem,
) =>
    resume.id ||
    resume.resume_id ||
    "";

const getResumeName = (
    resume: ResumeItem,
) =>
    resume.file_name ||
    resume.fileName ||
    resume.name ||
    "Resume";

const getResumeDate = (
    resume: ResumeItem,
) =>
    resume.created_at ||
    resume.createdAt ||
    "";

const formatDate = (value: string) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        },
    );
};

const validateFile = (
    file: File,
) => {
    const extension =
        `.${file.name.split(".").pop()?.toLowerCase()}`;

    if (
        extension !== ".pdf" &&
        extension !== ".docx"
    ) {
        return "Only PDF and DOCX files are supported.";
    }

    if (file.size === 0) {
        return "The selected file is empty.";
    }

    if (file.size > MAX_FILE_SIZE) {
        return "Resume must be smaller than 10 MB.";
    }

    return null;
};

export default function Resume() {
    const navigate = useNavigate();
    const inputRef =
        useRef<HTMLInputElement>(null);

    const [resumes, setResumes] =
        useState<ResumeItem[]>([]);
    const [loading, setLoading] =
        useState(true);
    const [uploading, setUploading] =
        useState(false);
    const [dragActive, setDragActive] =
        useState(false);

    const [error, setError] =
        useState<string | null>(null);
    const [success, setSuccess] =
        useState<string | null>(null);

    const loadResumes = async () => {
        try {
            setLoading(true);
            setError(null);

            const response =
                await api.get<ResumeResponse>(
                    API.RESUMES,
                );

            setResumes(
                normalizeResumes(response),
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load resumes.",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadResumes();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const uploadResume = async (
        file: File,
    ) => {
        const validationError =
            validateFile(file);

        if (validationError) {
            setError(validationError);
            setSuccess(null);
            return;
        }

        try {
            setUploading(true);
            setError(null);
            setSuccess(null);

            const formData = new FormData();
            formData.append("file", file);

            await api.post(
                API.UPLOAD_RESUME,
                formData,
            );

            await loadResumes();

            setSuccess(
                "Resume uploaded and processed successfully.",
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to upload the resume.",
            );
        } finally {
            setUploading(false);

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        }
    };

    const handleDrop = (
        event: DragEvent<HTMLDivElement>,
    ) => {
        event.preventDefault();
        setDragActive(false);

        const file =
            event.dataTransfer.files?.[0];

        if (file) {
            uploadResume(file);
        }
    };

    const openFilePicker = () => {
        inputRef.current?.click();
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Resume"
                description="Upload the resume you want the AI interviewer to use for personalization."
            />

            {(error || success) && (
                <div
                    className={`flex items-start gap-3 rounded-xl border p-4 ${error
                        ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
                        : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        }`}
                >
                    {error ? (
                        <X
                            size={18}
                            className="mt-0.5 shrink-0"
                        />
                    ) : (
                        <CheckCircle2
                            size={18}
                            className="mt-0.5 shrink-0"
                        />
                    )}

                    <p className="text-sm leading-5">
                        {error || success}
                    </p>

                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            setSuccess(null);
                        }}
                        className="ml-auto opacity-60 hover:opacity-100"
                    >
                        <X size={15} />
                    </button>
                </div>
            )}

            <section
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() =>
                    setDragActive(false)
                }
                onDrop={handleDrop}
                className={`rounded-2xl border border-dashed p-6 text-center transition sm:p-10 ${dragActive
                    ? "border-cyan-400 bg-cyan-400/5"
                    : "border-white/10 bg-slate-900"
                    }`}
            >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/10">
                    <UploadCloud
                        size={28}
                        className="text-cyan-400"
                    />
                </div>

                <h2 className="mt-4 text-lg font-bold text-white">
                    Upload your resume
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Drag and drop your PDF or DOCX here,
                    or choose a file from your device.
                </p>

                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(event) => {
                        const file =
                            event.target.files?.[0];

                        if (file) {
                            uploadResume(file);
                        }
                    }}
                    className="hidden"
                />

                <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={uploading}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {uploading ? (
                        <>
                            <Loader2
                                size={16}
                                className="animate-spin"
                            />
                            Processing...
                        </>
                    ) : (
                        <>
                            <UploadCloud size={16} />
                            Choose Resume
                        </>
                    )}
                </button>

                <p className="mt-3 text-[11px] text-slate-600">
                    PDF or DOCX • Maximum 10 MB
                </p>
            </section>

            <section>
                <div className="mb-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Your resumes
                        </p>

                        <h2 className="mt-1 text-lg font-bold text-white">
                            Resume library
                        </h2>
                    </div>

                    <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-xs text-slate-500">
                        {resumes.length} resume
                        {resumes.length === 1
                            ? ""
                            : "s"}
                    </span>
                </div>

                {loading ? (
                    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
                        <Loader2
                            size={28}
                            className="animate-spin text-cyan-400"
                        />
                    </div>
                ) : resumes.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-900 p-10 text-center">
                        <FileText
                            size={30}
                            className="mx-auto text-slate-600"
                        />

                        <p className="mt-3 text-sm font-semibold text-white">
                            No resumes uploaded yet
                        </p>

                        <p className="mt-1 text-xs text-slate-600">
                            Upload one above to start an interview.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {resumes.map(
                            (resume, index) => {
                                const id =
                                    getResumeId(
                                        resume,
                                    );

                                return (
                                    <article
                                        key={
                                            id ||
                                            index
                                        }
                                        className="rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-5"
                                    >
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-400/10">
                                                    <FileText
                                                        size={
                                                            20
                                                        }
                                                        className="text-cyan-400"
                                                    />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-white">
                                                        {getResumeName(
                                                            resume,
                                                        )}
                                                    </h3>

                                                    {getResumeDate(
                                                        resume,
                                                    ) && (
                                                            <p className="mt-1 text-xs text-slate-600">
                                                                Uploaded{" "}
                                                                {formatDate(
                                                                    getResumeDate(
                                                                        resume,
                                                                    ),
                                                                )}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={!id}
                                                onClick={() =>
                                                    navigate(
                                                        "/interview/setup",
                                                        {
                                                            state: {
                                                                resumeId:
                                                                    id,
                                                            },
                                                        },
                                                    )
                                                }
                                                className="inline-flex items-center justify-center rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Start Interview
                                            </button>
                                        </div>
                                    </article>
                                );
                            },
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}
