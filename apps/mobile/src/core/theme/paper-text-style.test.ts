import assert from "node:assert/strict";
import { test } from "node:test";
import { paperTextStyle } from "./paper-text-style";

test("all text roles use the bundled Vietnamese font and keep room for accents", () => {
  for (const fontSize of [11, 13, 15, 18, 26, 38]) {
    const style = paperTextStyle({ fontSize }, true);
    assert.equal(style.fontFamily, "PicketDisplay");
    assert.ok(style.lineHeight! >= fontSize * 1.25);
  }
});
test("custom lettering and explicit line heights survive; nested text inherits the parent", () => {
  assert.equal(paperTextStyle({ fontSize: 16, lineHeight: 30, fontFamily: "PicketHandwriting" }, true).lineHeight, 30);
  assert.equal(paperTextStyle({ fontFamily: "PicketHandwriting" }, true).fontFamily, "PicketHandwriting");
  assert.deepEqual(paperTextStyle({}, true, true), {});
});
test("a failed font load uses the native fallback without blocking text", () => {
  const style = paperTextStyle({}, false);
  assert.equal(style.fontFamily, undefined);
  assert.equal(style.fontSize, 15);
});


test("display weight roles select real static font faces instead of an Android variable-font default", () => {
  assert.equal(paperTextStyle({ fontWeight: "600" }, true).fontFamily, "PicketSemibold");
  assert.equal(paperTextStyle({ fontWeight: "700" }, true).fontFamily, "PicketBold");
  assert.equal(paperTextStyle({ fontWeight: "800", fontFamily: "PicketDisplay" }, true).fontFamily, "PicketExtraBold");
});
