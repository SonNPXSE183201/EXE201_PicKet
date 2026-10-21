import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Native screenshots at 150% reproduced wrapped hint text clipped by the
// single-line field. Labels carry the full purpose; examples stay short.
test("bill title example stays short enough for a scaled single-line input", () => {
  const screen = readFileSync(new URL("../../app/bills/new.tsx", import.meta.url), "utf8");
  assert.match(screen, /accessibilityLabel="Tên hóa đơn"/);
  assert.match(screen, /placeholder="Tiền điện"/);
});

test("keepsake search keeps its accessible label and a compact visible hint", () => {
  const screen = readFileSync(new URL("../../app/keepsakes.tsx", import.meta.url), "utf8");
  assert.match(screen, /accessibilityLabel="Tìm món đồ"/);
  assert.match(screen, /placeholder="Tìm món đồ"/);
});
