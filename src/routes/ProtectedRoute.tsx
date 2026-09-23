import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950">
                <Loader2
                    size={32}
                    className="animate-spin text-cyan-400"
                />
            </div>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/auth"
                replace
                state={{
                    from:
                        location.pathname +
                        location.search,
                }}
            />
        );
    }

    return <Outlet />;
}