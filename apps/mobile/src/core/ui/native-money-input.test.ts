import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { editNativeMoneyInput, shouldReleaseMoneySelection } from "./native-money-input";

test("money input derives text and caret from one native change event", () => {
  const source = readFileSync(new URL("./picket-text-input.tsx", import.meta.url), "utf8");
  assert.match(source, /event\.nativeEvent\.text/);
  assert.match(source, /event\.nativeEvent.*selection|nativeEvent\.selection/);
  assert.doesNotMatch(source, /setMoneySelection\(event\.nativeEvent\.selection\)/);
});

test("select-all and user caret movement release the formatting selection lock", () => {
  const target = { start: 5, end: 5 }, native = { start: 4, end: 4 };
  assert.equal(shouldReleaseMoneySelection({ start: 0, end: 5 }, target, native), true);
  assert.equal(shouldReleaseMoneySelection({ start: 2, end: 2 }, target, native), true);
  assert.equal(shouldReleaseMoneySelection(target, target, native), false);
  assert.equal(shouldReleaseMoneySelection(native, target, native), false);
  assert.equal(shouldReleaseMoneySelection(native, undefined, native), false);
});

test("native post-edit carets survive grouping, replacement and deletion", () => {
  for (const [previous, next, caret, raw, position] of [
    ["789", "7890", 4, "7890", 5],
    ["7.890", "7.8901", 6, "78901", 6],
    ["78.901", "78.9012", 7, "789012", 7],
    ["12.345", "129.345", 3, "129345", 3],
    ["1.234", "1.34", 2, "134", 1],
    ["1.234", "1234", 1, "234", 0],
    ["12.345", "12345.678", 9, "12345678", 10],
    ["111", "1111", 4, "1111", 5],
    ["-1.234", "-19.234", 3, "-19234", 3],
  ] as const) assert.deepEqual(editNativeMoneyInput(previous, next, { start: caret, end: caret }), { raw, selection: { start: position, end: position } });
});

test("native caret fallback handles absent or malformed event metadata", () => {
  for (const selection of [undefined, null, { end: -1 }, { start: 0, end: 99 }, { start: 0, end: NaN }]) {
    assert.deepEqual(editNativeMoneyInput("789", "7890", selection), { raw: "7890", selection: { start: 5, end: 5 } });
  }
  assert.equal(editNativeMoneyInput("", "12abc").raw, "12abc");
  assert.equal(editNativeMoneyInput("123", "").raw, "");
});
