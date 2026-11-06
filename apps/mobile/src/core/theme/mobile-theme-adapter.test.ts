import assert from "node:assert/strict";
import { test } from "node:test";
import { mobileThemeColors } from "./mobile-theme-adapter";
import { darkTheme, lightTheme } from "./themes";
test("compatibility roles follow the selected theme rather than a global mutable palette", () => {
  const light = mobileThemeColors(lightTheme), dark = mobileThemeColors(darkTheme);
  assert.equal(dark.cream, darkTheme.canvas);
  assert.equal(dark.ink, darkTheme.text);
  assert.notEqual(light.cream, dark.cream);
  assert.equal(light.cream, lightTheme.canvas);
});
