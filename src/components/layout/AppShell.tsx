import {
    BarChart3,
    FileText,
    History,
    LayoutDashboard,
    KeyRound,
    LogOut,
    Menu,
    Mic2,
    X,
} from "lucide-react";
import { useState } from "react";
import {
    NavLink,
    Outlet,
    useNavigate,
} from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";

const navigation = [
    {
        label: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        label: "Resume",
        path: "/resume",
        icon: FileText,
    },
    {
        label: "Interview",
        path: "/interview/setup",
        icon: Mic2,
    },
    {
        label: "History",
        path: "/history",
        icon: History,
    },
    {
        label: "Analytics",
        path: "/analytics",
        icon: BarChart3,
    },
    {
        label: "API Setup",
        path: "/settings/api",
        icon: KeyRound,
    },
];

function UserAvatar({
    name,
}: {
    name?: string | null;
}) {
    const initials =
        name
            ?.trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "U";

    return (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-bold text-white">
            {initials}
        </div>
    );
}

function Navigation({
    onNavigate,
    expanded = true,
}: {
    onNavigate?: () => void;
    expanded?: boolean;
}) {
    return (
        <nav className="space-y-1.5">
            {navigation.map(
                ({ label, path, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `flex items-center ${expanded ? "gap-3 px-3.5" : "justify-center px-2"} rounded-xl py-3 text-sm font-medium transition ${isActive
                                ? "bg-blue-500/10 text-blue-300 shadow-[inset_2px_0_0_#60a5fa]"
                                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                            }`
                        }
                    >
                        <Icon
                            size={18}
                            strokeWidth={1.8}
                        />
                        {expanded && <span>{label}</span>}
                    </NavLink>
                ),
            )}
        </nav>
    );
}

function Sidebar({
    onNavigate,
    onLogout,
    expanded = true,
    onToggle,
}: {
    onNavigate?: () => void;
    onLogout: () => void;
    expanded?: boolean;
    onToggle?: () => void;
}) {
    const { user } = useAuth();

    return (
        <aside className="flex h-full flex-col">
            <div className={`border-b border-white/[0.06] ${expanded ? "px-5" : "px-3"} py-5`}>
                <div className={`flex items-center ${expanded ? "gap-3" : "justify-center"}`}>
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
                        <Mic2 size={19} />
                    </div>

                    {expanded && <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                            AI Interview
                        </p>
                        <p className="text-[11px] text-slate-500">
                            Practice workspace
                        </p>
                    </div>}
                </div>
                {onToggle && <button type="button" onClick={onToggle} title={expanded ? "Collapse navigation" : "Expand navigation"} className={`mt-4 rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white ${expanded ? "" : "mx-auto block"}`}><Menu size={18} /></button>}
            </div>

            <div className={`flex-1 ${expanded ? "px-3" : "px-2"} py-5`}>
                <Navigation
                    onNavigate={onNavigate}
                    expanded={expanded}
                />
            </div>

            <div className={`border-t border-white/[0.06] ${expanded ? "p-4" : "p-3"}`}>
                <div className={`flex items-center ${expanded ? "gap-3" : "justify-center"}`}>
                    <UserAvatar
                        name={
                            user?.displayName ||
                            user?.email
                        }
                    />

                    {expanded && <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-200">
                            {user?.displayName ||
                                "User"}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                            {user?.email || ""}
                        </p>
                    </div>}

                    {expanded && <button
                        type="button"
                        onClick={onLogout}
                        title="Sign out"
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-rose-300"
                    >
                        <LogOut size={16} />
                    </button>}
                </div>
            </div>
        </aside>
    );
}

export default function AppShell() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] =
        useState(false);
    const [desktopExpanded, setDesktopExpanded] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate("/auth", { replace: true });
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className={`lg:grid lg:min-h-screen ${desktopExpanded ? "lg:grid-cols-[240px_1fr]" : "lg:grid-cols-[76px_1fr]"} transition-[grid-template-columns] duration-200`}>
                {/* Desktop sidebar */}
                <div className="hidden border-r border-white/[0.06] bg-slate-950 lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-hidden">
                    <Sidebar
                        onLogout={handleLogout}
                        expanded={desktopExpanded}
                        onToggle={() => setDesktopExpanded((value) => !value)}
                    />
                </div>

                {/* Mobile header */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.06] bg-slate-950/90 px-4 backdrop-blur-xl lg:hidden">
                    <div className="flex items-center gap-2.5">
                        <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/10 text-blue-300">
                            <Mic2 size={17} />
                        </div>
                        <span className="text-sm font-bold">
                            AI Interview
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setMobileOpen(true)
                        }
                        className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    >
                        <Menu size={21} />
                    </button>
                </header>

                {/* Mobile drawer */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <button
                            type="button"
                            aria-label="Close menu"
                            onClick={() =>
                                setMobileOpen(false)
                            }
                            className="absolute inset-0 bg-black/60"
                        />

                        <div className="relative h-full w-[280px] border-r border-white/[0.06] bg-slate-950">
                            <div className="absolute right-3 top-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setMobileOpen(
                                            false,
                                        )
                                    }
                                    className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <Sidebar
                                onNavigate={() =>
                                    setMobileOpen(false)
                                }
                                onLogout={handleLogout}
                                expanded
                            />
                        </div>
                    </div>
                )}

                {/* Main */}
                <main className="min-w-0">
                    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
