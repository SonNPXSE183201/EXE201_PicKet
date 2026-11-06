import assert from "node:assert/strict";
import { test } from "node:test";
import { lightTheme, darkTheme } from "./themes";
import { colorSchemes, colorSchemeIds } from "./color-schemes";
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(v => parseInt(v, 16)/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
}
test("semantic light/dark palettes have identical roles and readable foregrounds", () => {
  assert.deepEqual(Object.keys(lightTheme).sort(), Object.keys(darkTheme).sort());
  for (const theme of colorSchemeIds.flatMap(id => [colorSchemes[id].light, colorSchemes[id].dark])) {
    for (const [fg,bg] of [[theme.text,theme.canvas], [theme.text,theme.surface], [theme.muted,theme.canvas], [theme.onPrimary,theme.primary], [theme.expense,theme.dangerSurface], [theme.income,theme.successSurface]]) {
      const a=luminance(fg), b=luminance(bg);
      assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5, `${fg} on ${bg}`);
    }
  }
});
