import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
test("receipt system photo picker does not gate image selection behind broad library permission", () => {
  const source=readFileSync(new URL("../../app/capture/index.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(source,/requestMediaLibraryPermissionsAsync/);
  assert.match(source,/requestCameraPermissionsAsync/);
});
