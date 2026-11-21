import type { MonthForecast } from "./month-forecast";

type Ready = Extract<MonthForecast, { status: "ready" }>;

/** Headline state: on track, the low end of the range dips below zero, or the expected balance does. */
export function forecastStatus(forecast: Ready): { kind: "ok" } | { kind: "risk" | "negative"; day: string } {
  if (forecast.negativeDay) return { kind: "negative", day: forecast.negativeDay };
  if (forecast.riskDay) return { kind: "risk", day: forecast.riskDay };
  return { kind: "ok" };
}

/** Parses the scenario amount typed by the user (digits, dots, commas, spaces); null when empty or invalid. */
export function parseScenarioAmount(text: string): number | null {
  const digits = text.replace(/[\s.,]/g, "");
  if (!/^\d{1,13}$/.test(digits)) return null;
  const value = Number(digits);
  return value > 0 && value <= 9e12 ? value : null;
}
