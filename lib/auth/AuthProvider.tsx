import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { track } from "@/lib/analytics/events";
import { loginFailureReason } from "@/lib/analytics/mappers";
import { resetCurrentUserIdCache } from "@/lib/auth/currentUser";
import { onSessionInvalidated } from "@/lib/auth/sessionEvents";
import { authSession as defaultAuthSession, type AuthSession, type LoginCredentials, type SessionUser } from "@/lib/auth/session";
import { unregisterPushNotificationsAsync } from "@/lib/push/registerPushNotifications";

export type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: SessionUser | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
};

export type AuthProviderDeps = {
  session: AuthSession;
};

export function createAuthProvider(deps: AuthProviderDeps) {
  const AuthContext = createContext<AuthContextValue | null>(null);

  function AuthProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<SessionUser | null>(null);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const restored = await deps.session.getSessionUser();
          if (!mounted) return;
          setUser(restored);
        } finally {
          if (mounted) setIsLoading(false);
        }
      })();
      return () => {
        mounted = false;
      };
    }, []);

    useEffect(() => {
      return onSessionInvalidated(() => {
        resetCurrentUserIdCache();
        setUser(null);
      });
    }, []);

    useEffect(() => {
      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState !== "active") return;
        void deps.session.getSessionUser().then((restored) => {
          setUser(restored);
        });
      });
      return () => subscription.remove();
    }, []);

    const login = useCallback(async (credentials: LoginCredentials) => {
      resetCurrentUserIdCache();
      try {
        await deps.session.login(credentials);
      } catch (e) {
        track("connexion_echouee", { raison: loginFailureReason(e) });
        throw e;
      }
      track("connexion_reussie");
      const nextUser = await deps.session.getSessionUser();
      setUser(nextUser);
    }, []);

    const logout = useCallback(async () => {
      await unregisterPushNotificationsAsync();
      await deps.session.logout();
      resetCurrentUserIdCache();
      setUser(null);
    }, []);

    const value = useMemo<AuthContextValue>(
      () => ({
        isAuthenticated: user != null,
        isLoading,
        user,
        login,
        logout,
      }),
      [isLoading, login, logout, user],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  }

  function useAuth(): AuthContextValue {
    const value = useContext(AuthContext);
    if (!value) {
      throw new Error("useAuth must be used within AuthProvider");
    }
    return value;
  }

  return { AuthProvider, useAuth };
}

const defaultProvider = createAuthProvider({ session: defaultAuthSession });

export const AuthProvider = defaultProvider.AuthProvider;
export const useAuth = defaultProvider.useAuth;
