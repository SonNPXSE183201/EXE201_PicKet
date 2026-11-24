export type ForecastSettings = { enabled: boolean; minHistoryDays: number; lookbackMonths: number; signedIn: boolean; allowed: boolean; scenario: boolean };

/** Offline/local defaults never expose or compute a forecast. */
export const defaultForecastSettings: ForecastSettings = { enabled: true, minHistoryDays: 14, lookbackMonths: 3, signedIn: false, allowed: false, scenario: false };

export type ForecastAccess = "full" | "locked" | "signIn" | "hidden";

/** Shared by Home, detail and computation guards. Older APIs inherit session access. */
export function forecastAccess(settings: { enabled: boolean; signedIn?: boolean; allowed?: boolean }): ForecastAccess {
  if (!settings.enabled) return "hidden";
  if (!settings.signedIn) return "signIn";
  return (settings.allowed ?? settings.signedIn) ? "full" : "locked";
}

/** Accepts only well-formed settings; anything else falls back to the defaults. */
export function parseForecastSettings(value: unknown, sessionSignedIn = false): ForecastSettings {
  const row = value as Partial<Record<keyof ForecastSettings, unknown>> | null;
  if (
    !row ||
    typeof row.enabled !== "boolean" ||
    typeof row.scenario !== "boolean" ||
    (row.signedIn !== undefined && typeof row.signedIn !== "boolean") ||
    (row.allowed !== undefined && typeof row.allowed !== "boolean") ||
    !Number.isInteger(row.minHistoryDays) ||
    (row.minHistoryDays as number) < 1 ||
    (row.minHistoryDays as number) > 90 ||
    !Number.isInteger(row.lookbackMonths) ||
    (row.lookbackMonths as number) < 1 ||
    (row.lookbackMonths as number) > 6
  ) {
    return defaultForecastSettings;
  }
  const signedIn = (row.signedIn as boolean | undefined) ?? sessionSignedIn;
  const allowed = signedIn && ((row.allowed as boolean | undefined) ?? signedIn);
  return { enabled: row.enabled, minHistoryDays: row.minHistoryDays as number, lookbackMonths: row.lookbackMonths as number, signedIn, allowed, scenario: allowed && row.scenario };
}
