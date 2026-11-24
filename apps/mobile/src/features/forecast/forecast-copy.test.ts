import assert from "node:assert/strict";
import test from "node:test";

import { forecastEn, forecastVi } from "../../core/i18n/forecast-resources";
import { forecastStatus, parseScenarioAmount } from "@picket/domain";
import { forecastCurrencies } from "./forecast-currencies";

test("scenario amounts accept grouped digits and reject everything else", () => {
  assert.equal(parseScenarioAmount("1.500.000"), 1_500_000);
  assert.equal(parseScenarioAmount(" 250 000 "), 250_000);
  assert.equal(parseScenarioAmount("1,000"), 1000);
  assert.equal(parseScenarioAmount(""), null);
  assert.equal(parseScenarioAmount("0"), null);
  assert.equal(parseScenarioAmount("-5"), null);
  assert.equal(parseScenarioAmount("12k"), null);
  assert.equal(parseScenarioAmount("99999999999999"), null);
});

test("headline status: expected below zero beats a risky low end", () => {
  const ready = { negativeDay: null, riskDay: null } as Parameters<typeof forecastStatus>[0];
  assert.deepEqual(forecastStatus(ready), { kind: "ok" });
  assert.deepEqual(forecastStatus({ ...ready, riskDay: "2026-11-28" }), { kind: "risk", day: "2026-11-28" });
  assert.deepEqual(forecastStatus({ ...ready, riskDay: "2026-11-25", negativeDay: "2026-11-27" }), { kind: "negative", day: "2026-11-27" });
});

test("currencies put the profile currency first and skip archived or deleted wallets", () => {
  const w = (currencyCode: string, archived = false, deletedAt: string | null = null) => ({ currencyCode, archived, deletedAt });
  assert.deepEqual(forecastCurrencies([w("USD"), w("VND"), w("EUR", true), w("JPY", false, "x")], "VND"), ["VND", "USD"]);
  assert.deepEqual(forecastCurrencies([w("USD")], "VND"), ["USD"]);
  assert.deepEqual(forecastCurrencies([], "VND"), []);
});

test("forecast copy has the same keys and placeholders in Vietnamese and English", () => {
  assert.deepEqual(Object.keys(forecastVi).sort(), Object.keys(forecastEn).sort());
  const holes = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map(m => m[1]).sort();
  for (const key of Object.keys(forecastVi) as (keyof typeof forecastVi)[]) assert.deepEqual(holes(forecastVi[key]), holes(forecastEn[key]), key);
});
