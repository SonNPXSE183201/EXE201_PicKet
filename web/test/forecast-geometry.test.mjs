import test from "node:test";
import assert from "node:assert/strict";
import { chartGeometry, percentOf, shortDay } from "../src/features/forecast/forecast-geometry.ts";

const point = (day, expected, low = expected, high = expected) => ({ day, expected, low, high });

test("chart geometry puts today first and draws a zero line only when the range dips below zero", () => {
  const positive = chartGeometry([point("2026-11-24", 100), point("2026-11-25", 80, 60, 100)], 200, 100);
  assert.equal(positive.zeroY, null);
  assert.equal(positive.today.x, 0);
  assert.equal(positive.end.x, 200);
  assert.ok(positive.end.y > positive.today.y, "a lower balance is drawn lower");
  const negative = chartGeometry([point("2026-11-24", 100), point("2026-11-25", -50, -80, 0)], 200, 100);
  assert.notEqual(negative.zeroY, null);
  assert.ok(negative.zeroY < negative.end.y, "negative balances sit below the zero line");
});

test("chart geometry handles a single point and rejects an empty path", () => {
  assert.equal(chartGeometry([point("2026-11-30", 5)], 100, 50).end.x, 0);
  assert.throws(() => chartGeometry([], 100, 50));
});

test("progress and day helpers", () => {
  assert.equal(percentOf(5, 10), 50);
  assert.equal(percentOf(50, 10), 100);
  assert.equal(percentOf(-1, 10), 0);
  assert.equal(percentOf(1, 0), 0);
  assert.equal(shortDay("2026-11-30"), "30/11");
});

test("purchase and baseline paths share the same vertical scale", () => {
  const base = [point("2026-11-24", 100), point("2026-11-25", 80)];
  const purchase = base.map(p => ({...p, expected: p.expected - 90, low: p.low - 90, high: p.high - 90}));
  const scale = [...base, ...purchase];
  const a = chartGeometry(base, 200, 100, 8, scale);
  const b = chartGeometry(purchase, 200, 100, 8, scale);
  assert.equal(a.baseY, b.baseY);
  assert.ok(b.end.y > a.end.y);
});
