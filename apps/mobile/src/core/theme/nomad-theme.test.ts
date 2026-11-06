import assert from "node:assert/strict";
import test from "node:test";
import { colorSchemes, colorSchemeIds, resolveColorScheme } from "./color-schemes";
import { mobileThemeColors } from "./mobile-theme-adapter";

function contrast(a: string, b: string) {
  const luminance = (hex: string) => hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
test("Nomad is selectable with complete independent light and dark palettes", () => {
  assert.ok(colorSchemeIds.includes("nomad"));
  assert.equal(colorSchemes.nomad.light.canvas, "#FFFDF7");
  assert.equal(colorSchemes.nomad.dark.canvas, "#191814");
  assert.equal(resolveColorScheme("future-theme"), "paper");
});
test("all themes keep action text, links, states and controls readable", () => {
  for (const id of colorSchemeIds) for (const mode of ["light", "dark"] as const) {
    const c = colorSchemes[id][mode];
    for (const bg of [c.canvas, c.surface, c.elevated]) {
      for (const fg of [c.text, c.muted, c.link, c.income, c.expense]) assert.ok(contrast(fg, bg) >= 4.5, `${id}/${mode}: text on ${bg}`);
    }
    for (const [fg, bg] of [[c.onPrimary, c.primary], [c.onPrimary, c.primaryPressed], [c.selectedText, c.selectedSurface], [c.danger, c.dangerSurface], [c.warning, c.warningSurface], [c.info, c.infoSurface], [c.success, c.successSurface]]) assert.ok(contrast(fg, bg) >= 4.5, `${id}/${mode}: ${fg} on ${bg}`);
    assert.ok(contrast(c.controlBorder, c.surface) >= 3);
    const legacy = mobileThemeColors(c);
    assert.equal(legacy.link, c.link);
    assert.equal(legacy.onPrimary, c.onPrimary);
    assert.notEqual(c.danger, c.expense);
  }
});
