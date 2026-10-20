import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("partner notice rendering and link opening are scoped to the current owner", () => {
  const source = readFileSync(new URL("./partner-notice.tsx", import.meta.url), "utf8");
  assert.match(source, /snapshot\?\.owner === owner/);
  assert.match(source, /isCurrent\(\)/);
  assert.match(source, /setSnapshot\(null\)/);
  assert.doesNotMatch(source, /useState<PartnerAd \| null>/);
});
