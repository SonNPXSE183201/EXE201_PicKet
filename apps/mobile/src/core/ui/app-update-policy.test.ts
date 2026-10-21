import assert from "node:assert/strict";
import test from "node:test";

const load = () => import("../../features/updates/app-update-policy" + ".ts");
const release = { version: "1.0.3", versionCode: 4, publishedAt: "2026-10-21", filename: "picket-1.0.3-20261021-abcdef12-arm64.apk", abi: "arm64-v8a", minSdk: 24, packageName: "com.picket.mobile", bytes: 70_000_000, sha256: "a".repeat(64) };
const installed = { version: "1.0.2", versionCode: 3, packageName: "com.picket.mobile", sdk: 35, abis: ["arm64-v8a"], playStore: false };

test("a higher build code offers a pinned same-origin APK", async () => {
  const policy = await load();
  const result = policy.resolveAppUpdate(release, installed);
  assert.equal(result.kind, "available");
  assert.equal(result.release.downloadUrl, "https://picket.51-79-207-154.sslip.io/downloads/" + release.filename);
});
test("equal and older build codes never offer a downgrade", async () => {
  const policy = await load();
  for (const versionCode of [3, 2]) assert.equal(policy.resolveAppUpdate({ ...release, versionCode }, installed).kind, "current");
});
test("build code rather than lexical version determines an update", async () => {
  assert.equal((await load()).resolveAppUpdate({ ...release, version: "1.0.10" }, installed).kind, "available");
});
test("invalid or foreign metadata fails closed", async () => {
  const policy = await load();
  for (const change of [{ packageName: "evil.app" }, { abi: "x86_64" }, { versionCode: 4.5 }, { versionCode: "4" }, { version: "latest" }, { sha256: "invalid" }, { bytes: 0 }, { bytes: 600_000_000 }, { minSdk: -1 }, { publishedAt: "2026-02-31" }]) {
    assert.throws(() => policy.resolveAppUpdate({ ...release, ...change }, installed));
  }
  for (const value of [null, [], "release", {}]) assert.throws(() => policy.resolveAppUpdate(value, installed));
});
test("filenames cannot escape downloads or inject remote addresses", async () => {
  const policy = await load();
  for (const filename of ["../app.apk", "a/b.apk", "a\\b.apk", "https://evil.app/app.apk", "app.apk?x=1", "%2e%2e.apk", "app..apk"]) {
    assert.throws(() => policy.resolveAppUpdate({ ...release, filename }, installed));
  }
});
test("unsupported SDK, ABI and QA package do not offer installation", async () => {
  const policy = await load();
  for (const change of [{ sdk: 23 }, { abis: ["x86_64"] }, { packageName: "com.picket.mobile.qa" }]) {
    assert.equal(policy.resolveAppUpdate(release, { ...installed, ...change }).kind, "unsupported");
  }
});
test("Google Play installations use their own distribution channel", async () => {
  assert.equal((await load()).resolveAppUpdate(release, { ...installed, playStore: true }).kind, "play-store");
});
test("installed footer includes actual version and build even while offline", async () => {
  assert.equal((await load()).installedVersionLabel(installed), "Phiên bản 1.0.2 (3)");
  assert.equal((await load()).installedVersionLabel(null), "Chưa xác định phiên bản đã cài");
});
