import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("login spinners are scoped to the chosen action, other actions are disabled", () => {
  const login = source("../../app/(auth)/login.tsx");
  assert.match(login, /busy=\{pending === "password"\}/);
  assert.match(login, /busy=\{pending === "google"\}/);
  assert.match(login, /disabled=\{busy\}/);
});
test("camera exposes only one library action", () => {
  assert.equal((source("./receipt-camera.tsx").match(/onPress=\{onLibrary\}/g) ?? []).length, 1);
});
test("profile background refresh does not activate page loading and settings mutations do not force refresh", () => {
  const profile = source("../../features/profile/profile-context.tsx");
  const refresh = profile.slice(profile.indexOf("const refresh"), profile.indexOf("useEffect"));
  assert.doesNotMatch(refresh, /setLoading\(true\)/);
  assert.doesNotMatch(profile.slice(profile.indexOf("async updatePreferences")), /await refresh\(\)/);
});
test("device lock keeps children mounted and setting busy alone cannot lock the app", () => {
  const lock = source("../../features/security/device-lock.tsx");
  assert.doesNotMatch(lock, /locked \|\| busy && enabled/);
  assert.match(lock, /display: locked \? "none" : "flex"/);
});
test("dashboard retains loaded content during background refresh", () => {
  assert.match(source("../../app/index.tsx"), /!profile && \(profileLoading \|\| accountsLoading\)/);
});
test("launcher icon has a mask-safe inset and brand image cannot shrink inside a header", () => {
  assert.match(source("../../../plugins/with-safe-launcher-icon.js"), /inset="18%"/);
  assert.match(source("./brand-logo.tsx"), /flexShrink: 0/);
});
test("profile visibility switch persists directly instead of waiting for the save button", () => {
  assert.match(source("../../app/profile.tsx"), /onValueChange=\{\(next\) => void changeVisibility\(next\)\}/);
});

test("receipt calendar does not depend on unrelated session/transaction object identity or offer a header reload", () => {
  const calendar = source("./home-receipt-calendar.tsx");
  assert.doesNotMatch(calendar, /\[localMode, month, owner, retry, session, transactions\]/);
  assert.doesNotMatch(calendar, /title="Lịch hóa đơn" action="Tải lại"/);
  assert.doesNotMatch(calendar, /setData\(\{ owner, rows: \[\] \}\); setError/);
  assert.match(calendar, /hasSnapshot/);
  assert.match(calendar, /setInterval/);
  assert.match(calendar, /clearInterval/);
});

test("planning does not insert technical loading text when changing methods", () => {
  assert.doesNotMatch(source("../../app/planning.tsx"), /Đang tải toàn bộ giao dịch để tính chi tiêu/);
});
