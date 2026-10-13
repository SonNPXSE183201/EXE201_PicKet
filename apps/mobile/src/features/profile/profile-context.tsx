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

interface ProfileContextValue {
  loading: boolean;
  profile: CurrentProfile | null;
  error: string | null;
  refresh(): Promise<void>;
  completeOnboarding(request: CompleteOnboardingRequest): Promise<void>;
  updateProfile(patch: ProfilePatch): Promise<void>;
  updatePreferences(patch: PreferencesPatch): Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(session !== null);
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session || !picketApi) return;
    setLoading(true);
    setError(null);
    try {
      const result = await picketApi.currentProfile(session.access_token);
      setProfile(result.profile);
    } catch (error) {
      reportApiError("profile.refresh", error);
      setError(apiErrorMessage(error, "Không tải được hồ sơ."));
    } finally {
      setLoading(false);
    }
  }, [session]);

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
  }, [session]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      loading,
      profile,
      error,
      refresh,
      async completeOnboarding(request) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
        await picketApi.completeOnboarding(session.access_token, request);
        await refresh();
      },
      async updateProfile(patch) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
        await picketApi.updateProfile(session.access_token, patch);
        await refresh();
      },
      async updatePreferences(patch) {
        if (!session || !picketApi) throw new Error("Dart API is unavailable.");
        await picketApi.updatePreferences(session.access_token, patch);
        await refresh();
      },
    }),
    [error, loading, profile, refresh, session],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used inside ProfileProvider.");
  return context;
}
