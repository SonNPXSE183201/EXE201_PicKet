import test from "node:test";
import assert from "node:assert/strict";
import { minSupportedRisk } from "../src/features/admin/release-min-guard.ts";

const rows = [
  { channel: "play_production", version_code: 34, status: "live" },
  { channel: "play_production", version_code: 30, status: "superseded" },
  { channel: "play_internal", version_code: 40, status: "live" },
];
test("no floor or a floor at the previous build is safe", () => {
  assert.equal(minSupportedRisk("play_production", null, rows), "none");
  assert.equal(minSupportedRisk("play_production", 30, rows), "none");
});
test("a floor above the previous live build forces current users", () => {
  assert.equal(minSupportedRisk("play_production", 34, rows), "above_previous");
});
test("a floor above the live build locks everyone out", () => {
  assert.equal(minSupportedRisk("play_production", 35, rows), "above_live");
});
test("channels are evaluated independently and no live row means no risk", () => {
  assert.equal(minSupportedRisk("play_internal", 35, rows), "above_previous");
  assert.equal(minSupportedRisk("landing", 50, rows), "none");
});
