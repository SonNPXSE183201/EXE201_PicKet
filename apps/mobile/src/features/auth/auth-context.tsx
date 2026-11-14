import { picketApi } from "@/core/api/client";
import { phoneSignInTokens } from "@/features/auth/phone-sign-in";
import type { Session } from "@supabase/supabase-js";
import { passwordLoginCredentials } from '@picket/domain';
import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { AppState, Platform } from "react-native";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { authStorageKey, supabase } from "@/core/supabase/client";
import { secureAuthStorage } from "@/core/storage/secure-auth-storage";
import { AuthCallbackError, parseAuthCallbackUrl } from "@/features/auth/auth-callback";
import { recoverDeviceSession } from "@/features/auth/session-recovery";
import { createAuthMutationQueue, signOutDeviceSession } from "@/features/auth/device-sign-out";
import { nativeGoogleOutcome, shouldUseNativeGoogle } from "@/features/auth/google-sign-in-policy";

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
  signIn(identifier: string, password: string): Promise<void>;
  signUp(email: string, password: string, phone?: string): Promise<boolean>;
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

let configuredGoogleClientId: string | undefined;

async function loadGoogleSignin() {
  try {
    return (await import("@react-native-google-signin/google-signin")).GoogleSignin;
  } catch {
    // Expo Go and older binaries do not include the native module.
    return null;
  }
}

async function nativeGoogleIdToken(webClientId: string): Promise<string | null> {
  const GoogleSignin = await loadGoogleSignin();
  if (!GoogleSignin) return null;
  let result;
  try {
    if (configuredGoogleClientId !== webClientId) {
      GoogleSignin.configure({ webClientId });
      configuredGoogleClientId = webClientId;
    }
    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signOut();
    result = await GoogleSignin.signIn();
  } catch (error) {
    const outcome = nativeGoogleOutcome(error);
    if (outcome === "fallback") return null;
    if (outcome === "cancelled") {
      throw new AuthCallbackError("Đăng nhập Google đã bị hủy hoặc không hoàn tất.");
    }
    throw error;
  }
  const outcome = nativeGoogleOutcome(result);
  if (outcome === "cancelled") {
    throw new AuthCallbackError("Đăng nhập Google đã bị hủy hoặc không hoàn tất.");
  }
  return outcome === "token" && result.type === "success" ? result.data.idToken : null;
}

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
  // Supabase refreshes the access token roughly hourly (and right after a
  // resume). Keeping the same Session object for the same owner stops every
  // [session] effect from refetching all data; tokenVersion still re-renders
  // consumers so they read the new access_token.
  const sessionRef = useRef<Session | null>(null);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  const [tokenVersion, setTokenVersion] = useState(0);
  // Supabase's React Native guidance: refresh only while foregrounded, so the
  // token is renewed right on resume instead of by a stalled background timer.
  useEffect(() => {
    if (!supabase) return;
    const auth = supabase.auth;
    if (AppState.currentState === "active") void auth.startAutoRefresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void auth.startAutoRefresh();
      else void auth.stopAutoRefresh();
    });
    return () => listener.remove();
  }, []);
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
      const current = sessionRef.current;
      if (event === "TOKEN_REFRESHED" && current && next && current.user.id === next.user.id) {
        Object.assign(current, next);
        setTokenVersion((value) => value + 1);
        setLoading(false);
        return;
      }
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
      async signIn(identifier, password) {
        const credentials = passwordLoginCredentials(identifier, password);
        if (credentials.phone) {
          // Phone accounts sign in through the API until an SMS provider exists.
          const tokens = await phoneSignInTokens(picketApi, credentials.phone, credentials.password);
          const { error } = await mutateAuth(() => requireClient().auth.setSession(tokens));
          if (error) throw error;
          return;
        }
        const { error } = await mutateAuth(() => requireClient().auth.signInWithPassword(credentials));
        if (error) throw error;
      },
      async signUp(email, password, phone) {
        const { data, error } = await mutateAuth(() => requireClient().auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { emailRedirectTo: authCallbackUrl, ...(phone ? { data: { pending_phone: phone } } : {}) },
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
        const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
        if (clientId && shouldUseNativeGoogle({ platform: Platform.OS, clientId })) {
          const idToken = await nativeGoogleIdToken(clientId);
          if (idToken) {
            const { error } = await mutateAuth(() => requireClient().auth.signInWithIdToken({
              provider: "google",
              token: idToken,
            }));
            if (error) throw error;
            return;
          }
        }
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
        const browsers = Platform.OS === "android"
          ? await WebBrowser.getCustomTabsSupportingBrowsersAsync()
          : null;
        const browserPackage = browsers?.preferredBrowserPackage ??
          browsers?.browserPackages.find(pkg => browsers.servicePackages.includes(pkg));
        if (Platform.OS === "android" && !browserPackage) {
          throw new AuthCallbackError("Cần cài hoặc bật trình duyệt hỗ trợ đăng nhập (Chrome, Edge hoặc Firefox), rồi thử lại.");
        }
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, { browserPackage });
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
          expectedOwner: session?.user.id,
          storageKey,
          storage: secureAuthStorage,
        }));
        if (Platform.OS === "android") {
          try {
            const GoogleSignin = await loadGoogleSignin();
            await GoogleSignin?.signOut();
          } catch {
            // Google cleanup must not prevent local sign-out.
          }
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tokenVersion re-publishes the refreshed token
    [loading, localMode, localModeLoading, recovery, requireClient, session, tokenVersion],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
