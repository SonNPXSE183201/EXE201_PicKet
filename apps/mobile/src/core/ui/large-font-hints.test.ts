import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { billsVi, billsEn } from "../i18n/bill-resources";

// Native screenshots at 150% reproduced wrapped hint text clipped by the
// single-line field. Labels carry the full purpose; examples stay short.
test("bill title example stays short enough for a scaled single-line input", () => {
  const screen = readFileSync(new URL("../../app/bills/new.tsx", import.meta.url), "utf8");
  assert.match(screen, /accessibilityLabel=\{t\("name"\)\}/);
  assert.match(screen, /placeholder=\{t\("namePlaceholder"\)\}/);
  for (const copy of [billsVi, billsEn]) {
    assert.ok(copy.name.length > 0);
    assert.ok(copy.namePlaceholder.length <= 12, "Keep the example short in both languages");
  }
});

test("keepsake search keeps its accessible label and a compact visible hint", () => {
  const screen = readFileSync(new URL("../../app/keepsakes.tsx", import.meta.url), "utf8");
  assert.match(screen, /accessibilityLabel=\{t\("Tìm món đồ"\)\}/);
  assert.match(screen, /placeholder=\{t\("Tìm món đồ"\)\}/);
});
