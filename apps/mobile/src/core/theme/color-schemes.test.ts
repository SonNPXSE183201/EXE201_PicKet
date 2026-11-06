import assert from "node:assert/strict";
import { test } from "node:test";
import { colorSchemes, colorSchemeIds, resolveColorScheme } from "./color-schemes";
import { lightTheme } from "./themes";
test("each registered scheme supplies every semantic role in both modes", () => {
  for (const id of colorSchemeIds) for (const mode of ["light","dark"] as const) {
    assert.deepEqual(Object.keys(colorSchemes[id][mode]).sort(),Object.keys(lightTheme).sort());
    for (const color of Object.values(colorSchemes[id][mode])) assert.match(color,/^#(?:[\da-f]{6}|[\da-f]{8})$/i);
  }
  assert.equal(resolveColorScheme("retired-scheme"),"paper");
});
