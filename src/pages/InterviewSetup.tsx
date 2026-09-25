import {
    ArrowRight,
    BriefcaseBusiness,
    CheckCircle2,
    FileText,
    Loader2,
    Sparkles,
} from "lucide-react";

import {
    useEffect,
    useState,
    type CSSProperties,
    type FormEvent,
    type ReactNode,
} from "react";

import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import PageHeader from "../components/common/PageHeader";
import { api, API } from "../services/api";

/* =========================================================
   TYPES
========================================================= */

type ResumeItem = {
    id?: string;
    resume_id?: string;
    filename?: string;
    file_name?: string;
    fileName?: string;
    name?: string;
};

type ResumeResponse =
    | ResumeItem[]
    | {
        resumes?: ResumeItem[];
        items?: ResumeItem[];
        data?: ResumeItem[];
    };

type CreateInterviewResponse = {
    interview_id?: string;
};

type SetupState = {
    resumeId?: string;
};

/* =========================================================
   INTERVIEW OPTIONS
========================================================= */

const modes = [
    {
        value: "technical",
        label: "Technical",
        description:
            "Core CS, programming and role-specific technical questions.",
    },
    {
        value: "behavioral",
        label: "Behavioral",
        description:
            "Communication, teamwork, leadership and experience-based questions.",
    },
    {
        value: "mixed",
        label: "Mixed",
        description:
            "A combination of technical and behavioral questions.",
    },
    {
        value: "coding",
        label: "Coding",
        description:
            "Programming, algorithms and problem-solving questions.",
    },
    {
        value: "system_design",
        label: "System Design",
        description:
            "Architecture, scalability and system design questions.",
    },
] as const;

const difficulties = [
    {
        value: "easy",
        label: "Easy",
        description:
            "Fundamentals and confidence-building questions.",
    },
    {
        value: "medium",
        label: "Medium",
        description:
            "Balanced interview difficulty.",
    },
    {
        value: "hard",
        label: "Hard",
        description:
            "Deeper reasoning and advanced questions.",
    },
] as const;

/* =========================================================
   HELPERS
========================================================= */

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
): string => {
    return (
        resume.id ||
        resume.resume_id ||
        ""
    );
};

const getResumeName = (
    resume: ResumeItem,
): string => {
    return (
        resume.filename ||
        resume.file_name ||
        resume.fileName ||
        resume.name ||
        "Resume"
    );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function InterviewSetup() {
    const navigate = useNavigate();
    const location = useLocation();

    const incomingResumeId = (
        location.state as SetupState | null
    )?.resumeId;

    const [resumes, setResumes] =
        useState<ResumeItem[]>([]);

    const [resumeId, setResumeId] =
        useState<string>(
            incomingResumeId || "",
        );

    const [jobDescription, setJobDescription] =
        useState<string>("");

    const [mode, setMode] =
        useState<
            (typeof modes)[number]["value"]
        >("mixed");

    const [difficulty, setDifficulty] =
        useState<
            (typeof difficulties)[number]["value"]
        >("medium");

    // Default = 5 questions
    const [numQuestions, setNumQuestions] =
        useState<number>(5);

    const [loading, setLoading] =
        useState<boolean>(true);

    const [submitting, setSubmitting] =
        useState<boolean>(false);

    const [error, setError] =
        useState<string | null>(null);

    /* =====================================================
       LOAD RESUMES
    ====================================================== */

    useEffect(() => {
        let cancelled = false;

        const loadResumes = async () => {
            try {
                setLoading(true);
                setError(null);

                const response =
                    await api.get<ResumeResponse>(
                        API.RESUMES,
                    );

                if (cancelled) {
                    return;
                }

                const items =
                    normalizeResumes(response);

                setResumes(items);

                const incomingExists =
                    !!incomingResumeId &&
                    items.some(
                        (resume) =>
                            getResumeId(resume) ===
                            incomingResumeId,
                    );

                if (incomingExists) {
                    setResumeId(
                        incomingResumeId!,
                    );
                } else if (
                    items.length > 0
                ) {
                    setResumeId((current) => {
                        return (
                            current ||
                            getResumeId(items[0])
                        );
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load resumes.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadResumes();

        return () => {
            cancelled = true;
        };
    }, [incomingResumeId]);

    /* =====================================================
       SUBMIT
    ====================================================== */

    const submit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        setError(null);

        /* Resume is still required */
        if (!resumeId) {
            setError(
                "Please select a resume before starting.",
            );
            return;
        }

        /*
         * Job description is OPTIONAL.
         *
         * No validation is performed here.
         * An empty string is sent when the user
         * leaves the field blank.
         */
        const jd =
            jobDescription.trim();

        try {
            setSubmitting(true);

            const response =
                await api.post<CreateInterviewResponse>(
                    API.INTERVIEWS,
                    {
                        resume_id: resumeId,

                        /*
                         * Optional JD:
                         * empty string when not provided.
                         */
                        job_description: jd,

                        mode,
                        difficulty,
                        num_questions:
                            numQuestions,
                    },
                );

            const interviewId =
                response.interview_id;

            api.invalidate("/analytics/");

            if (!interviewId) {
                throw new Error(
                    "Interview was created, but no interview ID was returned.",
                );
            }

            navigate("/interview", {
                state: {
                    interviewId,
                },
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to create the interview.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    /* =====================================================
       SELECTED RESUME
    ====================================================== */

    const selectedResume =
        resumes.find(
            (resume) =>
                getResumeId(resume) ===
                resumeId,
        );

    /* =====================================================
       SLIDER PROGRESS
    ====================================================== */

    const sliderProgress =
        ((numQuestions - 1) / 19) * 100;

    const sliderStyle =
        {
            "--slider-progress":
                `${sliderProgress}%`,
        } as CSSProperties;

    /* =====================================================
       LOADING
    ====================================================== */

    if (loading) {
        return (
            <div className="space-y-4">
                <PageHeader
                    title="Interview Setup"
                    description="Configure your AI interview."
                />

                <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-white/10 bg-slate-900">
                    <Loader2
                        size={30}
                        className="animate-spin text-cyan-400"
                    />
                </div>
            </div>
        );
    }

    /* =====================================================
       NO RESUMES
    ====================================================== */

    if (!resumes.length) {
        return (
            <div className="space-y-4">
                <PageHeader
                    title="Interview Setup"
                    description="Configure your AI interview."
                />

                <section className="rounded-2xl border border-white/10 bg-slate-900 p-8 text-center">
                    <FileText
                        size={34}
                        className="mx-auto text-slate-600"
                    />

                    <h2 className="mt-4 text-lg font-bold text-white">
                        Upload a resume first
                    </h2>

                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                        Your resume is used to personalize interview questions.
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate("/resume")
                        }
                        className="mt-5 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                    >
                        Go to Resume
                    </button>
                </section>
            </div>
        );
    }

    /* =====================================================
       MAIN UI
    ====================================================== */

    return (
        <div className="space-y-4">
            {/* Custom slider CSS */}
            <style>
                {`
                    .question-slider {
                        width: 100%;
                        height: 8px;
                        appearance: none;
                        -webkit-appearance: none;
                        border-radius: 9999px;
                        outline: none;
                        cursor: pointer;
                        background:
                            linear-gradient(
                                to right,
                                #22d3ee 0%,
                                #22d3ee var(--slider-progress),
                                #1e293b var(--slider-progress),
                                #1e293b 100%
                            );
                    }

                    .question-slider::-webkit-slider-thumb {
                        appearance: none;
                        -webkit-appearance: none;
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #22d3ee;
                        border: 3px solid #0f172a;
                        box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.35);
                        cursor: pointer;
                    }

                    .question-slider::-moz-range-thumb {
                        width: 20px;
                        height: 20px;
                        border-radius: 50%;
                        background: #22d3ee;
                        border: 3px solid #0f172a;
                        box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.35);
                        cursor: pointer;
                    }
                `}
            </style>

            {/* Header */}
            <PageHeader
                title="Interview Setup"
                description="Configure your AI interview before entering the live session."
            />

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                </div>
            )}

            <form
                onSubmit={submit}
                className="space-y-4"
            >
                {/* =================================================
                   RESUME + JOB DESCRIPTION
                ================================================== */}

                <div className="grid gap-4 lg:grid-cols-[0.75fr_1.65fr]">
                    {/* Resume - Smaller */}
                    <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <FileText
                                size={18}
                                className="text-cyan-400"
                            />

                            <h2 className="text-base font-bold text-white">
                                Resume
                            </h2>
                        </div>

                        <select
                            value={resumeId}
                            onChange={(event) =>
                                setResumeId(
                                    event.target.value,
                                )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/40"
                        >
                            <option value="">
                                Select a resume
                            </option>

                            {resumes.map(
                                (
                                    resume,
                                    index,
                                ) => {
                                    const id =
                                        getResumeId(
                                            resume,
                                        );

                                    return (
                                        <option
                                            key={
                                                id ||
                                                index
                                            }
                                            value={id}
                                        >
                                            {getResumeName(
                                                resume,
                                            )}
                                        </option>
                                    );
                                },
                            )}
                        </select>

                        {selectedResume && (
                            <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-400/5 px-2.5 py-2 text-xs text-emerald-400">
                                <CheckCircle2
                                    size={14}
                                    className="shrink-0"
                                />

                                <span className="truncate">
                                    {
                                        getResumeName(
                                            selectedResume,
                                        )
                                    }{" "}
                                    selected
                                </span>
                            </div>
                        )}
                    </section>

                    {/* Job Description - Wider + Optional */}
                    <section className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <BriefcaseBusiness
                                    size={18}
                                    className="text-violet-400"
                                />

                                <div>
                                    <h2 className="text-base font-bold text-white">
                                        Job Description
                                    </h2>

                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Paste the role you are preparing for.
                                    </p>
                                </div>
                            </div>

                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400">
                                Optional
                            </span>
                        </div>

                        <textarea
                            value={jobDescription}
                            onChange={(event) =>
                                setJobDescription(
                                    event.target.value,
                                )
                            }
                            rows={4}
                            placeholder="Example: Software Engineer with strong knowledge of C++, DSA, REST APIs, SQL and cloud technologies..."
                            className="w-full resize-none rounded-xl border border-white/10 bg-slate-950 px-3.5 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40"
                        />

                        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600">
                            <span>
                                Leave blank for a general interview.
                            </span>

                            <span>
                                {jobDescription.length} characters
                            </span>
                        </div>
                    </section>
                </div>

                {/* =================================================
                   INTERVIEW TYPE + DIFFICULTY
                ================================================== */}

                <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
                    {/* Interview Type */}
                    <OptionGroup
                        title="Interview Type"
                        icon={
                            <Sparkles
                                size={18}
                                className="text-cyan-400"
                            />
                        }
                        options={modes}
                        value={mode}
                        onChange={setMode}
                        columns="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
                    />

                    {/* Difficulty */}
                    <OptionGroup
                        title="Difficulty"
                        options={difficulties}
                        value={difficulty}
                        onChange={setDifficulty}
                        columns="grid-cols-1 sm:grid-cols-3 xl:grid-cols-1"
                    />
                </div>

                {/* =================================================
                   QUESTION SLIDER
                ================================================== */}

                <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-base font-bold text-white">
                                Number of Questions
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                                Choose between 1 and 20 questions.
                            </p>
                        </div>

                        {/* Current value */}
                        <div className="flex h-12 min-w-[64px] items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4">
                            <span className="text-xl font-extrabold text-cyan-300">
                                {numQuestions}
                            </span>
                        </div>
                    </div>

                    <div className="mt-5 px-1">
                        <input
                            type="range"
                            min={1}
                            max={20}
                            step={1}
                            value={numQuestions}
                            onChange={(event) =>
                                setNumQuestions(
                                    Number(
                                        event.target
                                            .value,
                                    ),
                                )
                            }
                            style={sliderStyle}
                            className="question-slider"
                            aria-label="Number of questions"
                        />

                        <div className="mt-3 flex justify-between text-xs font-medium text-slate-500">
                            <span>1</span>
                            <span>5</span>
                            <span>10</span>
                            <span>15</span>
                            <span>20</span>
                        </div>
                    </div>

                    <div className="mt-3 text-center">
                        <span className="text-sm text-slate-400">
                            <span className="font-semibold text-cyan-300">
                                {numQuestions}
                            </span>{" "}
                            {numQuestions === 1
                                ? "question"
                                : "questions"}{" "}
                            will be generated
                        </span>
                    </div>
                </section>

                {/* =================================================
                   START BUTTON
                ================================================== */}

                <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting ? (
                        <>
                            <Loader2
                                size={18}
                                className="animate-spin"
                            />

                            Preparing Interview...
                        </>
                    ) : (
                        <>
                            Start InterviewYou

                            <ArrowRight
                                size={18}
                            />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}

/* =========================================================
   OPTION GROUP
========================================================= */

function OptionGroup<
    T extends readonly {
        value: string;
        label: string;
        description: string;
    }[],
>({
    title,
    icon,
    options,
    value,
    onChange,
    columns,
}: {
    title: string;
    icon?: ReactNode;
    options: T;
    value: T[number]["value"];
    onChange: (
        value: T[number]["value"],
    ) => void;
    columns: string;
}) {
    return (
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            {/* Section heading */}
            <div className="mb-4 flex items-center gap-2">
                {icon}

                <h2 className="text-base font-bold text-white">
                    {title}
                </h2>
            </div>

            {/* Options */}
            <div
                className={`grid gap-3 ${columns}`}
            >
                {options.map((option) => {
                    const selected =
                        value === option.value;

                    return (
                        <button
                            type="button"
                            key={option.value}
                            onClick={() =>
                                onChange(
                                    option.value,
                                )
                            }
                            className={`rounded-xl border p-4 text-left transition ${selected
                                    ? "border-cyan-400/40 bg-cyan-400/10"
                                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                                }`}
                        >
                            {/* Title */}
                            <div className="flex items-center justify-between gap-2">
                                <span
                                    className={`text-sm font-bold ${selected
                                            ? "text-cyan-300"
                                            : "text-white"
                                        }`}
                                >
                                    {option.label}
                                </span>

                                {selected && (
                                    <CheckCircle2
                                        size={17}
                                        className="shrink-0 text-cyan-300"
                                    />
                                )}
                            </div>

                            {/* Description */}
                            <p className="mt-2 text-xs leading-5 text-slate-400">
                                {option.description}
                            </p>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
