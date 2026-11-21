import assert from "node:assert/strict";
import test from "node:test";

import { defaultForecastSettings, parseForecastSettings } from "./forecast-settings-parse";

test("well-formed settings from the API are used as they are", () => {
  assert.deepEqual(parseForecastSettings({ enabled: false, minHistoryDays: 21, lookbackMonths: 6, scenario: true, revision: 4 }),
    { enabled: false, minHistoryDays: 21, lookbackMonths: 6, scenario: true });
});

test("anything malformed falls back to the safe defaults (forecast on, no scenario)", () => {
  for (const value of [null, "x", {}, { enabled: "yes", minHistoryDays: 14, lookbackMonths: 3, scenario: false },
    { enabled: true, minHistoryDays: 0, lookbackMonths: 3, scenario: false }, { enabled: true, minHistoryDays: 14, lookbackMonths: 7, scenario: false },
    { enabled: true, minHistoryDays: 1.5, lookbackMonths: 3, scenario: true }]) {
    assert.deepEqual(parseForecastSettings(value), defaultForecastSettings);
  }
  assert.equal(defaultForecastSettings.scenario, false);
});
