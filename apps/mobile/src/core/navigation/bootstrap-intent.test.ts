import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("native linking waits for the mounted session stack, without intercepting initial URLs", () => {
  const intent = readFileSync(new URL("../../app/+native-intent.ts", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../../app/_layout.tsx", import.meta.url), "utf8");
  assert.match(intent, /redirectSystemPath/);
  assert.match(intent, /bootstrapIntentGate\.redirect/);
  assert.match(layout, /bootstrapIntentGate\.ready\(\)/);
});
