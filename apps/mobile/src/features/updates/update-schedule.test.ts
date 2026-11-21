import assert from "node:assert/strict";
import test from "node:test";
import { APPLY_AFTER_BACKGROUND_MS, APPLY_WINDOW_MS, canApplyNow, canAutoDownload, choosePlayMode, opensApplyWindow, isRequired, shouldCheck, showBanner, showGate } from "./update-schedule";
import type { PlayUpdateInfo } from "./update-types";

const H = 3_600_000;
const info = (patch: Partial<PlayUpdateInfo> = {}): PlayUpdateInfo => ({ available: true, availableVersionCode: 40, priority: 0, stalenessDays: 1, flexibleAllowed: true, immediateAllowed: true, downloaded: false, inProgress: false, ...patch });

test("checks are spaced six hours apart unless forced", () => {
  assert.equal(shouldCheck(null, 1000), true);
  assert.equal(shouldCheck(0, 5 * H), false);
  assert.equal(shouldCheck(0, 6 * H), true);
  assert.equal(shouldCheck(5 * H, 4 * H), true);
  assert.equal(shouldCheck(0, H, { force: true }), true);
});
test("required updates always auto-download; optional need unmetered network and battery", () => {
  assert.equal(canAutoDownload({ conditions: null, required: true }), true);
  assert.equal(canAutoDownload({ conditions: null, required: false }), false);
  assert.equal(canAutoDownload({ conditions: { unmetered: false, batteryPercent: 90, charging: true }, required: false }), false);
  assert.equal(canAutoDownload({ conditions: { unmetered: true, batteryPercent: 19, charging: false }, required: false }), false);
  assert.equal(canAutoDownload({ conditions: { unmetered: true, batteryPercent: 19, charging: true }, required: false }), true);
  assert.equal(canAutoDownload({ conditions: { unmetered: true, batteryPercent: 20, charging: false }, required: false }), true);
});
test("play mode follows priority, minimum supported code and allowed types", () => {
  assert.equal(choosePlayMode({ info: info({ available: false }), installedCode: 1, minSupported: 10 }), "none");
  assert.equal(choosePlayMode({ info: info(), installedCode: 34, minSupported: null }), "flexible");
  assert.equal(choosePlayMode({ info: info({ priority: 4 }), installedCode: 34, minSupported: null }), "immediate");
  assert.equal(choosePlayMode({ info: info(), installedCode: 33, minSupported: 34 }), "immediate");
  assert.equal(choosePlayMode({ info: info(), installedCode: 34, minSupported: 34 }), "flexible");
  assert.equal(choosePlayMode({ info: info({ priority: 5, immediateAllowed: false }), installedCode: 34, minSupported: null }), "flexible");
  assert.equal(choosePlayMode({ info: info({ flexibleAllowed: false }), installedCode: 34, minSupported: null }), "none");
});
test("required comes from the release flag or the server minimum", () => {
  assert.equal(isRequired({ installedCode: 5, minSupported: 6 }), true);
  assert.equal(isRequired({ installedCode: 6, minSupported: 6 }), false);
  assert.equal(isRequired({ installedCode: 6, minSupported: null }), false);
  assert.equal(isRequired({ installedCode: 6, minSupported: null, releaseRequired: true }), true);
});
test("banner and gate visibility", () => {
  assert.equal(showBanner({ kind: "none" }, false), false);
  assert.equal(showBanner({ kind: "available" }, false), true);
  assert.equal(showBanner({ kind: "downloading", progress: 5 }, false), true);
  assert.equal(showBanner({ kind: "downloaded" }, false), true);
  assert.equal(showBanner({ kind: "failed" }, false), true);
  assert.equal(showBanner({ kind: "needs-user-action", action: "install" }, false), true);
  assert.equal(showBanner({ kind: "downloaded" }, true), false);
  assert.equal(showGate({ kind: "required" }, true), true);
  assert.equal(showGate({ kind: "failed" }, true), true);
  assert.equal(showGate({ kind: "none" }, true), false);
  assert.equal(showGate({ kind: "downloaded" }, false), false);
});

test("updates apply only right after opening the app, unless required", () => {
  const now = 1_000_000;
  assert.equal(canApplyNow({ required: true, windowOpenedAt: null, now }), true);
  assert.equal(canApplyNow({ required: false, windowOpenedAt: null, now }), false);
  assert.equal(canApplyNow({ required: false, windowOpenedAt: now - 5_000, now }), true);
  assert.equal(canApplyNow({ required: false, windowOpenedAt: now - APPLY_WINDOW_MS - 1, now }), false);
  assert.equal(opensApplyWindow(null, now), false);
  assert.equal(opensApplyWindow(now - 30_000, now), false);
  assert.equal(opensApplyWindow(now - APPLY_AFTER_BACKGROUND_MS, now), true);
});
