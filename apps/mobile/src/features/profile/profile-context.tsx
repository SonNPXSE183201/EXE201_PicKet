import type {
  CompleteOnboardingRequest,
  CurrentProfile,
  PreferencesPatch,
  ProfilePatch,
} from "@picket/domain";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { picketApi } from "@/core/api/client";
import { apiErrorMessage, reportApiError } from "@/core/api/api-error-message";
import { useAuth } from "@/features/auth/auth-context";
import { useCachedState } from "@/core/sync/use-cached-state";
import { useGuestFinance } from "@/core/local/guest-finance-context";

interface ProfileContextValue {
  loading: boolean;
  profile: CurrentProfile | null;
  error: string | null;
  refresh(options?: { throwOnError?: boolean }): Promise<void>;
  completeOnboarding(request: CompleteOnboardingRequest): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<void>;
  updatePreferences(patch: PreferencesPatch): Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const [loading, setLoading] = useState(session !== null);
  const [profile, setProfile] = useCachedState<CurrentProfile | null>(session?.user.id ?? null, "profile", null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { throwOnError?: boolean }) => {
    if (!session || !picketApi) { if (options?.throwOnError) throw new Error("Restore reload unavailable"); return; }
    setError(null);
    try {
      const result = await picketApi.currentProfile(session.access_token);
      setProfile(result.profile);
    } catch (error) {
      reportApiError("profile.refresh", error);
      setError(apiErrorMessage(error, "Không tải được hồ sơ."));
      if (options?.throwOnError) throw error;
    } finally {
      setLoading(false);
    }
  }, [session, setProfile]);

  useEffect(() => {
    if (!session || !picketApi) return;
    let active = true;
    void picketApi
      .currentProfile(session.access_token)
      .then((result) => {
        if (active) {
          setProfile(result.profile);
          setError(null);
        }
      })
      .catch((error) => {
        if (active) {
          reportApiError("profile.load", error);
          setError(apiErrorMessage(error, "Không tải được hồ sơ."));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session, setProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      loading: localMode ? guest.loading : loading,
      profile: localMode ? guest.data.profile : profile,
      error,
      refresh: localMode ? async () => undefined : refresh,
      async completeOnboarding(request) {
        if (localMode) { await guest.commit((current) => ({ type: "profile.replace", value: { ...current.profile, displayName: request.displayName, persona: request.persona, goal: request.goal, currencyCode: request.currencyCode, onboardingCompleted: true } })); return; }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        await picketApi.completeOnboarding(session.access_token, request);
        await refresh();
      },
      async updateProfile(patch) {
        if (localMode) { await guest.commit((current) => ({ type: "profile.replace", value: { ...current.profile, displayName: patch.display_name ?? current.profile.displayName, avatarUrl: patch.avatar_url ?? current.profile.avatarUrl, locale: patch.locale ?? current.profile.locale, timezone: patch.timezone ?? current.profile.timezone } })); return; }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        await picketApi.updateProfile(session.access_token, patch);
        setProfile(current => current ? { ...current, displayName: patch.display_name ?? current.displayName,
          avatarUrl: patch.avatar_url === undefined ? current.avatarUrl : patch.avatar_url,
          locale: patch.locale ?? current.locale, timezone: patch.timezone ?? current.timezone } : current);
      },
      async updatePreferences(patch) {
        if (localMode) { await guest.commit((current) => ({ type: "profile.replace", value: { ...current.profile, persona: patch.persona ?? current.profile.persona, goal: patch.goal ?? current.profile.goal, currencyCode: patch.currency_code ?? current.profile.currencyCode, hideBalance: patch.hide_balance ?? current.profile.hideBalance } })); return; }
        if (!session || !picketApi) throw new Error("Chưa thể hoàn tất. Hãy kiểm tra kết nối và thử lại.");
        await picketApi.updatePreferences(session.access_token, patch);
        setProfile(current => current ? { ...current, persona: patch.persona ?? current.persona,
          goal: patch.goal ?? current.goal, currencyCode: patch.currency_code ?? current.currencyCode,
          hideBalance: patch.hide_balance ?? current.hideBalance } : current);
      },
    }),
    [error, guest, loading, localMode, profile, refresh, session, setProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used inside ProfileProvider.");
  return context;
}
