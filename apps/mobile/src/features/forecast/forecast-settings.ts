import { useEffect, useState } from "react";

import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";

import { defaultForecastSettings, parseForecastSettings, type ForecastSettings } from "@picket/domain";

export { defaultForecastSettings, parseForecastSettings, type ForecastSettings };

// Last answer per owner, so Home and detail can render safely while settings refresh.
const cache = new Map<string, ForecastSettings>();

export function useForecastSettings() {
  const { session, localMode, loading: authLoading } = useAuth();
  const token = session?.access_token;
  const owner = session?.user.id ?? "local";
  const [loaded, setLoaded] = useState<{ owner: string; value: ForecastSettings } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [request, setRequest] = useState(0);
  useEffect(() => {
    if (!picketApi) return;
    const controller = new AbortController();
    picketApi
      .forecastSettings(token, controller.signal)
      .then(value => {
        const response = parseForecastSettings(value, !!token && !localMode);
        const parsed = !token || localMode ? { ...response, signedIn: false, allowed: false, scenario: false } : response;
        cache.set(owner, parsed);
        if (!controller.signal.aborted) { setLoaded({ owner, value: parsed }); setFailure(null); }
      })
      .catch(() => { if (!controller.signal.aborted) setFailure(owner); });
    return () => controller.abort();
  }, [owner, token, localMode, request]);
  const value = loaded?.owner === owner ? loaded.value : cache.get(owner);
  return {
    settings: value ?? defaultForecastSettings,
    loading: authLoading || (!!token && !localMode && !!picketApi && !value && failure !== owner),
    error: !!token && !localMode && !value && (failure === owner || !picketApi),
    refetch: () => { setFailure(null); setRequest(value => value + 1); },
  };
}
