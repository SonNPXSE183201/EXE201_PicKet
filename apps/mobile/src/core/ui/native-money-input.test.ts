import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("money input derives text and caret from one native change event", () => {
  const source = readFileSync(new URL("./picket-text-input.tsx", import.meta.url), "utf8");
  assert.match(source, /event\.nativeEvent\.text/);
  assert.match(source, /event\.nativeEvent.*selection|nativeEvent\.selection/);
  assert.doesNotMatch(source, /setMoneySelection\(event\.nativeEvent\.selection\)/);
});
