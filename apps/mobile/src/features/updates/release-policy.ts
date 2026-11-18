import type { ReleasePolicy } from "./update-types";

const MAX_CODE = 2_100_000_000;

function code(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 1 && value <= MAX_CODE) return value;
  return undefined;
}

/** Strictly validates the policy JSON; anything unexpected yields null. */
export function parseReleasePolicy(input: unknown, channel: "play" | "apk"): ReleasePolicy | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const value = input as Record<string, unknown>;
  const latest = code(value.latestVersionCode), min = code(value.minSupportedVersionCode);
  if (latest === undefined || min === undefined) return null;
  if (value.channel !== undefined && value.channel !== channel) return null;
  return { channel, latestVersionCode: latest, minSupportedVersionCode: min };
}

/** Never throws: a network or format problem must not block the user. */
export async function fetchReleasePolicy(apiBase: string, channel: "play" | "apk", versionCode: number, fetcher: typeof fetch = fetch): Promise<ReleasePolicy | null> {
  if (!Number.isSafeInteger(versionCode) || versionCode < 1) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = `${apiBase.replace(/\/+$/, "")}/v1/releases/policy?channel=${channel}&versionCode=${versionCode}`;
    const response = await fetcher(url, { signal: controller.signal, credentials: "omit", headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const text = await response.text();
    if (text.length > 8192) return null;
    return parseReleasePolicy(JSON.parse(text), channel);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
