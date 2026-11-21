import { useEffect, useState } from "react";

import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";

import { defaultForecastSettings, parseForecastSettings, type ForecastSettings } from "./forecast-settings-parse";

export { defaultForecastSettings, parseForecastSettings, type ForecastSettings };

// Last answer per signed-in owner, so Home and the detail screen agree without refetching.
const cache = new Map<string, ForecastSettings>();

export function useForecastSettings(): ForecastSettings {
  const { session } = useAuth();
  const token = session?.access_token;
  const owner = session?.user.id ?? "local";
  const [loaded, setLoaded] = useState<{ owner: string; value: ForecastSettings } | null>(null);
  useEffect(() => {
    if (!picketApi) return;
    const controller = new AbortController();
    picketApi
      .forecastSettings(token, controller.signal)
      .then(value => {
        const parsed = parseForecastSettings(value);
        cache.set(owner, parsed);
        if (!controller.signal.aborted) setLoaded({ owner, value: parsed });
      })
      .catch(() => { /* Keep the cached or default settings. */ });
    return () => controller.abort();
  }, [owner, token]);
  return loaded?.owner === owner ? loaded.value : cache.get(owner) ?? defaultForecastSettings;
}
