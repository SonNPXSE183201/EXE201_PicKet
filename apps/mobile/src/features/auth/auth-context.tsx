import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authStorageKey, supabase } from "@/core/supabase/client";
import { secureAuthStorage } from "@/core/storage/secure-auth-storage";
import { AuthCallbackError, parseAuthCallbackUrl } from "@/features/auth/auth-callback";
import { recoverDeviceSession } from "@/features/auth/session-recovery";
import { createAuthMutationQueue, signOutDeviceSession } from "@/features/auth/device-sign-out";

WebBrowser.maybeCompleteAuthSession();

const authCallbackUrl = Linking.createURL("auth/callback", {
  scheme: "com.picket.mobile",
});
const passwordRecoveryUrl = Linking.createURL("auth/reset-password", {
  scheme: "com.picket.mobile",
});

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  recovery: boolean;
  session: Session | null;
  localMode: boolean;
  enterLocalMode(): Promise<void>;
  leaveLocalMode(): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<boolean>;
  verifySignup(email: string, token: string): Promise<void>;
  resendSignup(email: string): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const localModeStorageKey = "picket_local_mode_v1";

let callbackExchange: Promise<boolean> | null = null;
const mutateAuth = createAuthMutationQueue();

async function exchangeCallbackUrl(url: string): Promise<boolean> {
  const client = supabase;
  if (!client) return false;
  if (callbackExchange) return callbackExchange;

  callbackExchange = mutateAuth(async () => {
    const { accessToken, code, errorDescription, refreshToken } = parseAuthCallbackUrl(url);
    if (errorDescription) throw new AuthCallbackError(errorDescription);

    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    }

    if (accessToken && refreshToken) {
      const { error } = await client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) throw error;
      return true;
    }

    if (accessToken || refreshToken) {
      throw new AuthCallbackError("Phản hồi đăng nhập không đầy đủ. Vui lòng thử lại.");
    }

    return false;
  });

  try {
    return await callbackExchange;
  } finally {
    callbackExchange = null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabase !== null);
  const [localMode, setLocalMode] = useState(false);
  const [localModeLoading, setLocalModeLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(localModeStorageKey)
      .then((stored) => { if (active) setLocalMode(stored === "true"); })
      .catch(() => undefined)
      .finally(() => { if (active) setLocalModeLoading(false); });
    if (!supabase) {
      return () => { active = false; };
    }

    let authRevision = 0;
    const initialRevision = authRevision;
    const isCurrent = () => active && authRevision === initialRevision;
    void recoverDeviceSession({
      getSession: () => supabase!.auth.getSession(),
      readPersisted: () => Platform.OS !== "web" && authStorageKey
        ? secureAuthStorage.getItem(authStorageKey) : Promise.resolve(null),
      isCurrent,
    }).then((restored) => {
      if (isCurrent()) {
        setSession(restored);
        setLoading(false);
      }
    });
    const authSubscription = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      // INITIAL_SESSION null may mean a network-only refresh failure. Let the
      // guarded bootstrap decide; a real SIGNED_OUT must always invalidate it.
      if (event === "INITIAL_SESSION" && !next) return;
      authRevision++;
      setSession(next);
      if (next) {
        setLocalMode(false);
        void SecureStore.setItemAsync(localModeStorageKey, "false").catch(() => undefined);
      }
      setRecovery(event === "PASSWORD_RECOVERY");
      setLoading(false);
    });
    const linkSubscription = Linking.addEventListener("url", ({ url }) => {
      void exchangeCallbackUrl(url).catch(() => {
        setLoading(false);
      });
    });
    void Linking.getInitialURL().then((url) => {
      if (url) {
        void exchangeCallbackUrl(url).catch(() => {
          setLoading(false);
        });
      }
    });

    return () => {
      active = false;
      authSubscription.data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  const requireClient = useCallback(() => {
    if (!supabase) throw new Error("Supabase public configuration is missing.");
    return supabase;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: supabase !== null,
      loading: loading || localModeLoading,
      recovery,
      session,
      localMode: localMode && !session,
      async enterLocalMode() {
        if (session) throw new Error("Sign out before switching to local mode.");
        await SecureStore.setItemAsync(localModeStorageKey, "true");
        setLocalMode(true);
      },
      async leaveLocalMode() {
        await SecureStore.setItemAsync(localModeStorageKey, "false");
        setLocalMode(false);
      },
      async signIn(email, password) {
        const { error } = await mutateAuth(() => requireClient().auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        }));
        if (error) throw error;
      },
      async signUp(email, password) {
        const { data, error } = await mutateAuth(() => requireClient().auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: authCallbackUrl },
        }));
        if (error) throw error;
        return data.session === null;
      },
      async verifySignup(email, token) {
        const { error } = await mutateAuth(() => requireClient().auth.verifyOtp({
          email: email.trim().toLowerCase(),
          token: token.trim(),
          type: "signup",
        }));
        if (error) throw error;
      },
      async resendSignup(email) {
        const { error } = await requireClient().auth.resend({
          type: "signup",
          email: email.trim().toLowerCase(),
          options: { emailRedirectTo: authCallbackUrl },
        });
        if (error) throw error;
      },
      async requestPasswordReset(email) {
        const { error } = await requireClient().auth.resetPasswordForEmail(
          email.trim().toLowerCase(),
          { redirectTo: passwordRecoveryUrl },
        );
        if (error) throw error;
      },
      async updatePassword(password) {
        const { error } = await mutateAuth(() => requireClient().auth.updateUser({ password }));
        if (error) throw error;
        setRecovery(false);
      },
      async signInWithGoogle() {
        const redirectTo = authCallbackUrl;
        const { data, error } = await mutateAuth(() => requireClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: { prompt: "select_account" },
          },
        }));
        if (error) throw error;
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (result.type === "success") {
          const handled = await exchangeCallbackUrl(result.url);
          if (!handled) {
            throw new AuthCallbackError(
              "Google không trả về phiên đăng nhập. Vui lòng thử lại.",
            );
          }
          return;
        }

        const { data: current } = await requireClient().auth.getSession();
        if (!current.session) {
          throw new AuthCallbackError("Đăng nhập Google đã bị hủy hoặc không hoàn tất.");
        }
      },
      async signOut() {
        const storageKey = authStorageKey;
        if (!storageKey) throw new Error("Supabase public configuration is missing.");
        await mutateAuth(() => signOutDeviceSession({
          auth: requireClient().auth,
          storageKey,
          storage: secureAuthStorage,
        }));
      },
    }),
    [loading, localMode, localModeLoading, recovery, requireClient, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
