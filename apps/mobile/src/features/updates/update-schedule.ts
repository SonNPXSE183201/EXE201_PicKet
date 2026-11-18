import type { DeviceConditions, PlayUpdateInfo } from "./update-types";

export const MIN_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const MIN_BATTERY_PERCENT = 20;
/** Play priority at or above which the immediate (blocking) flow is used. */
export const IMMEDIATE_PRIORITY = 4;

export type UpdateState =
  | { kind: "none" }
  | { kind: "available" }
  | { kind: "downloading"; progress: number }
  | { kind: "downloaded" }
  | { kind: "needs-user-action"; action: "install" | "openSettings" }
  | { kind: "required" }
  | { kind: "failed" };

export type UpdateStateKind = UpdateState["kind"];

/** An update is applied (app restarts) only in the first seconds after the app opens or comes back. */
export const APPLY_WINDOW_MS = 20_000;
/** Coming back after this long in the background counts as "opening the app again". */
export const APPLY_AFTER_BACKGROUND_MS = 2 * 60_000;

/**
 * Installing restarts PicKet, so it must never cut into what the user is doing:
 * required updates apply at once; optional ones only right after the app opens
 * (cold start or a return after a long background stay).
 */
export function canApplyNow(input: { required: boolean; windowOpenedAt: number | null; now: number }): boolean {
  if (input.required) return true;
  if (input.windowOpenedAt === null) return false;
  const elapsed = input.now - input.windowOpenedAt;
  return elapsed >= 0 && elapsed <= APPLY_WINDOW_MS;
}

/** A return to the foreground opens a new apply window only after a long background stay. */
export function opensApplyWindow(backgroundSince: number | null, now: number): boolean {
  return backgroundSince !== null && now - backgroundSince >= APPLY_AFTER_BACKGROUND_MS;
}

/** Check at most every 6 hours unless forced; a clock that went backwards counts as due. */
export function shouldCheck(lastCheckedAt: number | null, now: number, options: { force?: boolean } = {}): boolean {
  if (options.force) return true;
  if (lastCheckedAt === null || !Number.isFinite(lastCheckedAt)) return true;
  const elapsed = now - lastCheckedAt;
  return elapsed < 0 || elapsed >= MIN_CHECK_INTERVAL_MS;
}

/** Required updates always download; optional ones need an unmetered network and enough battery. */
export function canAutoDownload(input: { conditions: DeviceConditions | null; required: boolean }): boolean {
  if (input.required) return true;
  const c = input.conditions;
  if (!c) return false;
  return c.unmetered && (c.batteryPercent >= MIN_BATTERY_PERCENT || c.charging);
}

export function choosePlayMode(input: { info: PlayUpdateInfo; installedCode: number; minSupported: number | null }): "immediate" | "flexible" | "none" {
  const { info, installedCode, minSupported } = input;
  if (!info.available) return "none";
  const mustUpdate = (minSupported !== null && installedCode < minSupported) || info.priority >= IMMEDIATE_PRIORITY;
  if (mustUpdate && info.immediateAllowed) return "immediate";
  if (info.flexibleAllowed) return "flexible";
  return "none";
}

export function isRequired(input: { installedCode: number; minSupported: number | null; releaseRequired?: boolean }): boolean {
  return Boolean(input.releaseRequired) || (input.minSupported !== null && input.installedCode < input.minSupported);
}

/** Optional updates surface as a small card on Home; required ones use the full-screen gate instead. */
export function showBanner(state: UpdateState, required: boolean): boolean {
  if (required) return false;
  return state.kind === "available" || state.kind === "downloading" || state.kind === "downloaded" || state.kind === "needs-user-action" || state.kind === "failed";
}

export function showGate(state: UpdateState, required: boolean): boolean {
  return required && state.kind !== "none";
}
