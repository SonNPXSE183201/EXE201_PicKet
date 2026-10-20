import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("capture invalidates in-flight work on owner change and gates image acceptance", () => {
  const source = readFileSync(new URL("../../app/capture/index.tsx", import.meta.url), "utf8");
  assert.match(source, /activeOwner\.current = ownerId;\s*imageGeneration\.current\+\+;/);
  assert.match(source, /async function acceptImage\(uri: string\) \{\s*if \(!ownerId \|\| activeOwner\.current !== ownerId\) return;/);
  assert.match(source, /const current = \(\) => mounted\.current && activeOwner\.current === ownerId && generation === imageGeneration\.current/);
  assert.match(source, /if \(activeOwner\.current !== ownerId\) return;\s*router\.push/);
});
