import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
const file = (path: string) => new URL(path, import.meta.url);
test("profile exposes the updater and ends with the installed version", () => {
  const profile = readFileSync(file("../../app/profile.tsx"), "utf8");
  assert.match(profile, /<AppUpdateSection\s*\/>/);
  assert.match(profile, /<InstalledVersion\s*\/>\s*<\/ScrollView>/);
});
test("native updates declare scoped installer permission and a private provider", () => {
  const path = file("../../../modules/picket-app-updates/android/src/main/AndroidManifest.xml");
  assert.ok(existsSync(path), "Native update module must persist installer configuration across prebuild");
  const manifest = readFileSync(path, "utf8");
  assert.match(manifest, /REQUEST_INSTALL_PACKAGES/);
  assert.match(manifest, /android:exported="false"/);
  assert.match(manifest, /android:grantUriPermissions="true"/);
});
