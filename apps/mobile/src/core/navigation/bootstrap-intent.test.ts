import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createBootstrapIntentGate, latestInitialNativeIntent } from "./bootstrap-intent";

test("native linking waits for the mounted session stack, without intercepting initial URLs", () => {
  const intent = readFileSync(new URL("../../app/+native-intent.ts", import.meta.url), "utf8");
  const layout = readFileSync(new URL("../../app/_layout.tsx", import.meta.url), "utf8");
  assert.match(intent, /redirectSystemPath/);
  assert.match(intent, /bootstrapIntentGate\.redirect/);
  assert.match(intent, /Linking\.getInitialURL\(\)/);
  assert.match(layout, /bootstrapIntentGate\.ready\(\)/);
});

test("initial URL never waits for the provider it must first mount", () => {
  const gate = createBootstrapIntentGate();
  assert.equal(gate.redirect({ path: "com.picket.mobile://capture?date=2026-10-19", initial: true }), "com.picket.mobile://capture?date=2026-10-19");
});

test("current Activity URL wins; a launcher without VIEW data keeps its root path", () => {
  assert.equal(latestInitialNativeIntent("home", "com.picket.mobile://keepsakes"), "com.picket.mobile://keepsakes");
  assert.equal(latestInitialNativeIntent("home", null), "home");
  assert.equal(latestInitialNativeIntent("original", "com.picket.mobile://"), "com.picket.mobile://");
});

test("warm intent during bootstrap waits for stack commit; only newest pending intent wins", async () => {
  const gate = createBootstrapIntentGate();
  let settled = false;
  const first = Promise.resolve(gate.redirect({ path: "com.picket.mobile://keepsakes", initial: false })).then(path => { settled = true; return path; });
  await Promise.resolve(); assert.equal(settled, false);
  const latest = gate.redirect({ path: "com.picket.mobile://capture?date=2026-10-19", initial: false });
  assert.equal(await first, "");
  gate.ready();
  assert.equal(await latest, "com.picket.mobile://capture?date=2026-10-19");
  gate.ready();
  assert.equal(gate.redirect({ path: "com.picket.mobile://transactions", initial: false }), "com.picket.mobile://transactions");
});

test("OAuth and password recovery payloads are returned unchanged, never parsed or logged", async () => {
  const gate = createBootstrapIntentGate();
  const callback = "com.picket.mobile://auth/callback?code=synthetic-test-only";
  assert.equal(gate.redirect({ path: callback, initial: true }), callback);
  const recovery = "com.picket.mobile://auth/reset-password?type=recovery";
  const pending = gate.redirect({ path: recovery, initial: false });
  gate.ready(); assert.equal(await pending, recovery);
});

test("a recovery boundary can pause an already mounted stack until it is mounted again", async () => {
  const gate = createBootstrapIntentGate(); gate.ready(); gate.notReady();
  let settled = false;
  const first = Promise.resolve(gate.redirect({ path: "private-account-route", initial: false })).then(path => { settled = true; return path; });
  await Promise.resolve(); assert.equal(settled, false);
  const latest = gate.redirect({ path: "latest-route", initial: false });
  assert.equal(await first, ""); gate.ready();
  assert.equal(await latest, "latest-route");
});
