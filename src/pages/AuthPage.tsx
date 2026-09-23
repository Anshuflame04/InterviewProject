import {
    AlertCircle,
    Loader2,
    LogIn,
    UserPlus,
} from "lucide-react";
import {
    type FormEvent,
    useState,
} from "react";
import {
    Navigate,
    useLocation,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";

type AuthMode = "login" | "register";

function getFirebaseMessage(
    error: unknown,
): string {
    const code = (
        error as { code?: string }
    )?.code;

    switch (code) {
        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Invalid email or password.";

        case "auth/email-already-in-use":
            return "An account with this email already exists.";

        case "auth/weak-password":
            return "Password must contain at least 6 characters.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        default:
            return (
                (error as { message?: string })
                    ?.message ||
                "Authentication failed. Please try again."
            );
    }
}

export default function AuthPage() {
    const {
        user,
        loading,
        login,
        register,
    } = useAuth();

    const location = useLocation();

    const [mode, setMode] =
        useState<AuthMode>("login");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [error, setError] = useState("");
    const [submitting, setSubmitting] =
        useState(false);

    if (!loading && user) {
        const from =
            (
                location.state as {
                    from?: string;
                } | null
            )?.from || "/dashboard";

        return (
            <Navigate
                to={from}
                replace
            />
        );
    }

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();
        setError("");

        const trimmedEmail =
            email.trim();

        if (!trimmedEmail || !password) {
            setError(
                "Please enter your email and password.",
            );
            return;
        }

        if (mode === "register") {
            if (!name.trim()) {
                setError(
                    "Please enter your name.",
                );
                return;
            }

            if (password.length < 6) {
                setError(
                    "Password must contain at least 6 characters.",
                );
                return;
            }

            if (password !== confirmPassword) {
                setError(
                    "Passwords do not match.",
                );
                return;
            }
        }

        try {
            setSubmitting(true);

            if (mode === "login") {
                await login(
                    trimmedEmail,
                    password,
                );
            } else {
                await register(
                    name,
                    trimmedEmail,
                    password,
                );
            }
        } catch (err) {
            console.error(
                "Authentication failed:",
                err,
            );
            setError(
                getFirebaseMessage(err),
            );
        } finally {
            setSubmitting(false);
        }
    };

    const switchMode = () => {
        setError("");
        setPassword("");
        setConfirmPassword("");

        setMode((current) =>
            current === "login"
                ? "register"
                : "login",
        );
    };

    const isLogin = mode === "login";

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8 text-white">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
                        {isLogin ? (
                            <LogIn size={25} />
                        ) : (
                            <UserPlus size={25} />
                        )}
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight">
                        AI Interview Platform
                    </h1>

                    <p className="mt-2 text-sm text-slate-400">
                        Practice smarter. Interview better.
                    </p>
                </div>

                <section className="rounded-2xl border border-white/[0.08] bg-slate-900 p-6 shadow-2xl sm:p-8">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-white">
                            {isLogin
                                ? "Welcome back"
                                : "Create your account"}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            {isLogin
                                ? "Sign in to continue your interview preparation."
                                : "Create an account to start practicing interviews."}
                        </p>
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="mb-5 flex gap-2.5 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3.5 text-sm text-rose-300"
                        >
                            <AlertCircle
                                size={17}
                                className="mt-0.5 shrink-0"
                            />
                            <span>{error}</span>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        {!isLogin && (
                            <Field
                                id="name"
                                label="Full name"
                                value={name}
                                onChange={setName}
                                placeholder="Enter your name"
                                autoComplete="name"
                                disabled={submitting}
                            />
                        )}

                        <Field
                            id="email"
                            label="Email"
                            type="email"
                            value={email}
                            onChange={setEmail}
                            placeholder="you@example.com"
                            autoComplete="email"
                            disabled={submitting}
                        />

                        <Field
                            id="password"
                            label="Password"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="Enter your password"
                            autoComplete={
                                isLogin
                                    ? "current-password"
                                    : "new-password"
                            }
                            disabled={submitting}
                        />

                        {!isLogin && (
                            <Field
                                id="confirmPassword"
                                label="Confirm password"
                                type="password"
                                value={confirmPassword}
                                onChange={
                                    setConfirmPassword
                                }
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                                disabled={submitting}
                            />
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {submitting && (
                                <Loader2
                                    size={16}
                                    className="animate-spin"
                                />
                            )}

                            {submitting
                                ? isLogin
                                    ? "Signing in..."
                                    : "Creating account..."
                                : isLogin
                                    ? "Sign In"
                                    : "Create Account"}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        {isLogin
                            ? "Don't have an account?"
                            : "Already have an account?"}{" "}
                        <button
                            type="button"
                            onClick={switchMode}
                            disabled={submitting}
                            className="font-medium text-blue-400 hover:text-blue-300 disabled:cursor-not-allowed"
                        >
                            {isLogin
                                ? "Create one"
                                : "Sign in"}
                        </button>
                    </div>
                </section>
            </div>
        </main>
    );
}

function Field({
    id,
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    autoComplete,
    disabled,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    placeholder: string;
    autoComplete: string;
    disabled: boolean;
}) {
    return (
        <div>
            <label
                htmlFor={id}
                className="mb-1.5 block text-sm font-medium text-slate-200"
            >
                {label}
            </label>

            <input
                id={id}
                type={type}
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                placeholder={placeholder}
                autoComplete={autoComplete}
                disabled={disabled}
                className="w-full rounded-xl border border-white/[0.08] bg-slate-800/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
        </div>
    );
}