export type ForecastSettings = { enabled: boolean; minHistoryDays: number; lookbackMonths: number; scenario: boolean };

/** Used offline, in local mode, or when the API cannot be reached: forecast on, no scenario. */
export const defaultForecastSettings: ForecastSettings = { enabled: true, minHistoryDays: 14, lookbackMonths: 3, scenario: false };

/** Accepts only well-formed settings; anything else falls back to the defaults. */
export function parseForecastSettings(value: unknown): ForecastSettings {
  const row = value as Partial<Record<keyof ForecastSettings, unknown>> | null;
  if (
    !row ||
    typeof row.enabled !== "boolean" ||
    typeof row.scenario !== "boolean" ||
    !Number.isInteger(row.minHistoryDays) ||
    (row.minHistoryDays as number) < 1 ||
    (row.minHistoryDays as number) > 90 ||
    !Number.isInteger(row.lookbackMonths) ||
    (row.lookbackMonths as number) < 1 ||
    (row.lookbackMonths as number) > 6
  ) {
    return defaultForecastSettings;
  }
  return { enabled: row.enabled, minHistoryDays: row.minHistoryDays as number, lookbackMonths: row.lookbackMonths as number, scenario: row.scenario };
}
