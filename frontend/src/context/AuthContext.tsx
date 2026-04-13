"use client";

import { createContext, useEffect, useState, type ReactNode } from "react";
import {
    changePasswordApi,
    forgotPasswordApi,
    loginApi,
    refreshTokenApi,
    resetPasswordApi,
    logoutApi,
} from "@/api/auth";

export type AuthRole = "CLIENT" | "THERAPIST" | "ADMIN";

export type AuthUser = {
    id?: string;
    name?: string;
    email: string;
    role: AuthRole;
};

type AuthContextValue = {
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (payload: { email: string; password: string; role: AuthRole }) => Promise<void>;
    refreshSession: () => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<string>;
    resetPassword: (payload: { token: string; newPassword: string }) => Promise<string>;
    changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<string>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
    children: ReactNode;
};

const AUTH_STORAGE_KEY = "psycho_auth";

type StoredAuth = {
    user: AuthUser;
    accessToken: string | null;
    refreshToken: string | null;
};

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [refreshToken, setRefreshToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as StoredAuth;
            setUser(parsed.user);
            setAccessToken(parsed.accessToken);
            setRefreshToken(parsed.refreshToken);
        } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }, []);

    function persistAuth(next: StoredAuth | null) {
        if (!next) {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            return;
        }

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    }

    async function login(payload: { email: string; password: string; role: AuthRole }) {
        setIsLoading(true);
        try {
            const response = await loginApi(payload);
            const nextUser = response.data.user;
            const nextAccessToken = response.data.accessToken ?? null;
            const nextRefreshToken = response.data.refreshToken ?? null;

            setUser(nextUser);
            setAccessToken(nextAccessToken);
            setRefreshToken(nextRefreshToken);
            persistAuth({ user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken });
        } finally {
            setIsLoading(false);
        }
    }

    async function logout() {
        setIsLoading(true);
        try {
            await logoutApi(accessToken ?? undefined);
        } finally {
            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
            persistAuth(null);
            setIsLoading(false);
        }
    }

    async function refreshSession() {
        if (!refreshToken) {
            throw new Error("Refresh token missing");
        }

        const response = await refreshTokenApi({ refreshToken });
        const nextUser = response.data.user ?? user;
        const nextAccessToken = response.data.accessToken ?? accessToken;
        const nextRefreshToken = response.data.refreshToken ?? refreshToken;

        setUser(nextUser ?? null);
        setAccessToken(nextAccessToken ?? null);
        setRefreshToken(nextRefreshToken ?? null);

        if (nextUser && nextAccessToken) {
            persistAuth({
                user: nextUser,
                accessToken: nextAccessToken,
                refreshToken: nextRefreshToken ?? null,
            });
        }
    }

    async function forgotPassword(email: string) {
        const response = await forgotPasswordApi({ email });
        return response.data.resetToken ? `${response.message}\nReset Token: ${response.data.resetToken}` : response.message;
    }

    async function resetPassword(payload: { token: string; newPassword: string }) {
        const response = await resetPasswordApi(payload);
        return response.message;
    }

    async function changePassword(payload: { currentPassword: string; newPassword: string }) {
        if (!accessToken) {
            throw new Error("You are not logged in");
        }

        const response = await changePasswordApi({
            currentPassword: payload.currentPassword,
            newPassword: payload.newPassword,
            accessToken,
        });

        return response.message;
    }

    const value: AuthContextValue = {
        user,
        accessToken,
        refreshToken,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        refreshSession,
        logout,
        forgotPassword,
        resetPassword,
        changePassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
