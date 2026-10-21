import assert from "node:assert/strict";
import test from "node:test";
const load = () => import("../../features/updates/app-update-controller" + ".ts");
const release = { version: "1.0.3", versionCode: 4, bytes: 100, sha256: "a".repeat(64), filename: "app.apk", downloadUrl: "https://picket.51-79-207-154.sslip.io/downloads/app.apk", abi: "arm64-v8a", minSdk: 24, packageName: "com.picket.mobile", publishedAt: "2026-10-21" };
const deferred = <T>() => { let resolve!: (value: T) => void; let reject!: (reason: Error) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function setup() {
  const { createAppUpdateController } = await load();
  const events: string[] = []; let allowed = false;
  const deps = { check: async () => ({ kind: "available", release }), download: async (_release: unknown, _signal: AbortSignal, progress: (value: number) => void) => { progress(50); return "private.apk"; }, canInstall: () => allowed, openSettings: async () => { events.push("settings"); }, openInstaller: async () => { events.push("installer"); }, openStore: async () => { events.push("store"); } };
  const controller = createAppUpdateController(deps, () => undefined);
  return { deps, events, controller, allow: () => { allowed = true; } };
}
test("checking never automatically downloads or opens Android settings", async () => {
  const { controller, events } = await setup();
  await controller.check(); assert.equal(controller.snapshot().phase, "available"); assert.deepEqual(events, []);
});
test("permission requires an explicit action; resume does not auto-install", async () => {
  const { controller, events, allow } = await setup();
  await controller.check(); await controller.download(); await controller.install();
  assert.equal(controller.snapshot().phase, "permission"); assert.deepEqual(events, []);
  await controller.openSettings(); assert.deepEqual(events, ["settings"]);
  allow(); controller.refreshPermission(); assert.equal(controller.snapshot().phase, "ready");
  assert.deepEqual(events, ["settings"]); await controller.install();
  assert.equal(controller.snapshot().phase, "installer-opened"); assert.deepEqual(events, ["settings", "installer"]);
});
test("download failure never enables installation and can be checked again", async () => {
  const { controller, deps, events } = await setup(); await controller.check();
  deps.download = async () => { throw new Error("corrupt"); }; await controller.download();
  assert.equal(controller.snapshot().phase, "error"); await controller.install(); assert.deepEqual(events, []);
  await controller.check(); assert.equal(controller.snapshot().phase, "available");
});
test("cancelled or disposed downloads cannot publish late success", async () => {
  for (const dispose of [false, true]) {
    const { controller, deps } = await setup(); const pending = deferred<string>();
    let signal: AbortSignal | undefined;
    deps.download = async (_release: unknown, value: AbortSignal) => { signal = value; return pending.promise; };
    await controller.check(); const task = controller.download();
    if (dispose) controller.dispose(); else controller.cancel();
    assert.ok(signal?.aborted); pending.resolve("late.apk"); await task;
    assert.notEqual(controller.snapshot().phase, "ready");
  }
});
test("double taps create only one download", async () => {
  const { controller, deps } = await setup(); const pending = deferred<string>(); let calls = 0;
  deps.download = async () => { calls++; return pending.promise; }; await controller.check();
  const first = controller.download(); await controller.download(); assert.equal(calls, 1);
  pending.resolve("private.apk"); await first; assert.equal(controller.snapshot().phase, "ready");
});
test("network failure reports an error and ignores a late check after disposal", async () => {
  const { controller, deps } = await setup(); deps.check = async () => { throw new Error("offline"); };
  await controller.check(); assert.equal(controller.snapshot().phase, "error");
  const pending = deferred<{ kind: string; release: typeof release }>(); deps.check = () => pending.promise;
  const task = controller.check(); controller.dispose(); pending.resolve({ kind: "available", release }); await task;
  assert.notEqual(controller.snapshot().phase, "available");
});
test("installer double taps open only one Android confirmation", async () => {
  const { controller, deps, allow } = await setup(); const pending = deferred<void>(); let calls = 0;
  deps.openInstaller = async () => { calls++; return pending.promise; };
  await controller.check(); await controller.download(); allow();
  const first = controller.install(), second = controller.install();
  try { assert.equal(calls, 1); }
  finally { pending.resolve(); await Promise.all([first, second]); }
  assert.equal(controller.snapshot().phase, "installer-opened");
});
test("effect reactivation supports React StrictMode without accepting disposed requests", async () => {
  const { controller } = await setup(); controller.dispose(); controller.activate();
  await controller.check(); assert.equal(controller.snapshot().phase, "available");
});

test("reactivation during a pending check allows retry and ignores the old response", async () => {
  const { controller, deps } = await setup();
  const stale = deferred<{ kind: string; release: typeof release }>();
  deps.check = () => stale.promise;
  const oldCheck = controller.check();
  controller.dispose(); controller.activate();
  deps.check = async () => ({ kind: "available", release });
  await controller.check();
  try { assert.equal(controller.snapshot().phase, "available"); }
  finally { stale.reject(new Error("old request")); await oldCheck; }
  assert.equal(controller.snapshot().phase, "available");
});

test("reactivation after download disposal offers a new download without stale success", async () => {
  const { controller, deps } = await setup();
  const stale = deferred<string>();
  deps.download = () => stale.promise;
  await controller.check(); const oldDownload = controller.download();
  controller.dispose(); controller.activate();
  try { assert.equal(controller.snapshot().phase, "available"); }
  finally { stale.resolve("stale.apk"); await oldDownload; }
  deps.download = async () => "new.apk";
  await controller.download();
  assert.equal(controller.snapshot().file, "new.apk");
});
