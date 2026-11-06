import assert from "node:assert/strict";
import { test } from "node:test";
import { colorSchemes, resolveColorScheme } from "./color-schemes";

function contrast(a: string, b: string) {
  const luminance = (hex: string) => hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

test("Paper is the fallback while explicit saved palettes remain available", () => {
  assert.equal(resolveColorScheme(), "paper");
  assert.equal(resolveColorScheme("nomad"), "nomad");
});

test("Paper supports readable text, actions and category pockets in both modes", () => {
  const paper = (colorSchemes as Record<string, typeof colorSchemes.nomad>).paper;
  assert.ok(paper, "Paper must be registered");
  for (const mode of ["light", "dark"] as const) {
    const c = paper[mode];
    for (const [fg, bg] of [[c.text, c.canvas], [c.muted, c.canvas], [c.onPrimary, c.primary], [c.text, c.pocketCoral], [c.text, c.pocketMint], [c.text, c.pocketBlue], [c.text, c.pocketLilac]]) {
      assert.ok(contrast(fg, bg) >= 4.5, `${mode}: ${fg} on ${bg}`);
    }
  }
});
