import assert from "node:assert/strict";
import test from "node:test";

import { defaultForecastSettings, forecastAccess, parseForecastSettings } from "@picket/domain";

test("well-formed settings from the API are used as they are", () => {
  assert.deepEqual(parseForecastSettings({ enabled: false, minHistoryDays: 21, lookbackMonths: 6, scenario: true, signedIn: true, allowed: true, revision: 4 }),
    { enabled: false, minHistoryDays: 21, lookbackMonths: 6, scenario: true, signedIn: true, allowed: true });
});

test("forecast access never exposes numbers to signed-out or locked users", () => {
  for (const enabled of [true, false]) for (const signedIn of [true, false]) for (const allowed of [true, false, undefined]) {
    assert.equal(forecastAccess({ enabled, signedIn, allowed }), !enabled ? "hidden" : !signedIn ? "signIn" : allowed === false ? "locked" : "full");
  }
  assert.equal(forecastAccess({ enabled: true }), "signIn");
});

test("old API uses the authenticated session; offline defaults deny access", () => {
  const old = { enabled: true, minHistoryDays: 14, lookbackMonths: 3, scenario: true };
  assert.equal(forecastAccess(parseForecastSettings(old, true)), "full");
  assert.equal(forecastAccess(parseForecastSettings(old)), "signIn");
  assert.equal(forecastAccess(parseForecastSettings({ ...old, signedIn: true, allowed: false }, true)), "locked");
  assert.equal(forecastAccess(defaultForecastSettings), "signIn");
  assert.equal(parseForecastSettings({ ...old, allowed: "yes" }, true), defaultForecastSettings);
});

test("anything malformed falls back to the safe defaults (forecast on, no scenario)", () => {
  for (const value of [null, "x", {}, { enabled: "yes", minHistoryDays: 14, lookbackMonths: 3, scenario: false },
    { enabled: true, minHistoryDays: 0, lookbackMonths: 3, scenario: false }, { enabled: true, minHistoryDays: 14, lookbackMonths: 7, scenario: false },
    { enabled: true, minHistoryDays: 1.5, lookbackMonths: 3, scenario: true }]) {
    assert.deepEqual(parseForecastSettings(value), defaultForecastSettings);
  }
  assert.equal(defaultForecastSettings.scenario, false);
});
