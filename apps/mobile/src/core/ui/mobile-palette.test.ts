import assert from "node:assert/strict";
import { test } from "node:test";
import { colors } from "./mobile-palette";
function luminance(hex: string) {
  const values = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}
test("mobile text and primary buttons retain readable contrast", () => {
  for (const [text, background] of [[colors.ink, colors.cream], [colors.muted, colors.cream], [colors.white, colors.mauve]]) {
    const a = luminance(text), b = luminance(background);
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5);
  }
});
