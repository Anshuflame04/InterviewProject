import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from "firebase/auth";

import { auth } from "../firebase";
import { loadLlmSettingsFromFirebase } from "../services/llmSettings";
import { AuthContext } from "./auth-context";
import type { User } from "firebase/auth";

export { AuthContext } from "./auth-context";

export function AuthProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        return onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                void loadLlmSettingsFromFirebase()
                    .then(() => window.dispatchEvent(new Event("llm-settings-changed")))
                    .catch((error: unknown) => console.warn("Could not load saved API settings:", error));
            }
            setLoading(false);
        });
    }, []);

    const login = useCallback(
        async (email: string, password: string) => {
            await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password,
            );
        },
        [],
    );

    const register = useCallback(
        async (
            name: string,
            email: string,
            password: string,
        ) => {
            const credential =
                await createUserWithEmailAndPassword(
                    auth,
                    email.trim(),
                    password,
                );

            await updateProfile(credential.user, {
                displayName: name.trim(),
            });
        },
        [],
    );

    const logout = useCallback(async () => {
        await signOut(auth);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
