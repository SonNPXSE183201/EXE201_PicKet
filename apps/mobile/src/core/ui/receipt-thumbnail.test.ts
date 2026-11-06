import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Android calendar thumbnails downsample base64 photos to their display size", () => {
  const source=readFileSync(new URL("./month-calendar.tsx",import.meta.url),"utf8");
  assert.match(source,/resizeMethod="resize"/);
});
