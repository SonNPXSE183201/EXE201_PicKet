import assert from "node:assert/strict";
import test from "node:test";

import {
  createPhoneResetSession,
  createPhoneSignupSession,
  PhoneSignupStepError,
  requestPhoneCode,
  type PhoneAuthDriver,
  type PhoneAuthEvent,
} from "./phone-signup-session";

function fakeDriver(options: { currentUserToken?: string | null } = {}) {
  const calls: { phone: string; forceResend: boolean; emit(event: PhoneAuthEvent): void; fail(error: unknown): void }[] = [];
  const log: string[] = [];
  let signIns = 0;
  const driver: PhoneAuthDriver = {
    verifyPhoneNumber(phone, _timeout, forceResend, onEvent, onError) {
      calls.push({ phone, forceResend, emit: onEvent, fail: onError });
    },
    async signInWithCode(verificationId, code) {
      signIns++;
      if (code === "000000") throw Object.assign(new Error("bad"), { code: "auth/invalid-verification-code" });
      return `token:${verificationId}:${code}`;
    },
    async currentIdToken() {
      return "fresh-token";
    },
    async instantIdToken(phone) {
      log.push(`instant:${phone}`);
      return options.currentUserToken ?? null;
    },
    async cleanup() {
      log.push("cleanup");
    },
  };
  return { driver, calls, log, signIns: () => signIns };
}

test("requestPhoneCode settles once and forwards a later SMS Retriever code", async () => {
  const { driver, calls } = fakeDriver();
  const auto: string[] = [];
  const pending = requestPhoneCode(driver, "+84912345678", { onAutoCode: (code) => auto.push(code) });
  calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  calls[0].emit({ state: "timeout", verificationId: "v1", code: null });
  calls[0].emit({ state: "verified", verificationId: "v1", code: "123456" });
  calls[0].emit({ state: "verified", verificationId: "v1", code: "123456" });
  calls[0].emit({ state: "error", verificationId: "v1", code: null, error: new Error("late") });
  assert.deepEqual(await pending, { verificationId: "v1", autoCode: null, instant: false });
  assert.deepEqual(auto, ["123456"]);
});

test("requestPhoneCode resolves instant verification and rejects errors", async () => {
  const { driver, calls } = fakeDriver();
  const instant = requestPhoneCode(driver, "+84912345678");
  calls[0].emit({ state: "verified", verificationId: "v2", code: "222222" });
  assert.deepEqual(await instant, { verificationId: "v2", autoCode: "222222", instant: false });
  const failed = requestPhoneCode(driver, "+84912345678");
  const error = { code: "auth/quota-exceeded" };
  calls[1].emit({ state: "error", verificationId: "", code: null, error });
  calls[1].fail(new Error("second"));
  await assert.rejects(failed, (reason) => reason === error);
});

test("SMS sign-up: API start, Firebase code, one sign-in, then account + session + Firebase cleanup", async () => {
  const fake = fakeDriver();
  const apiCalls: unknown[][] = [];
  const sessions: unknown[] = [];
  const session = createPhoneSignupSession({
    driver: () => fake.driver,
    api: () => ({
      async phoneSignupStart(phone) {
        apiCalls.push(["start", phone]);
        return { ok: true };
      },
      async phoneSignupComplete(phone, idToken, password) {
        apiCalls.push(["complete", phone, idToken, password]);
        return { access_token: "a", refresh_token: "r" };
      },
    }),
    async setSession(tokens) {
      sessions.push(tokens);
    },
  });
  await assert.rejects(session.complete("PicketPassword1!"), PhoneSignupStepError);
  // The code screen opens as soon as the API accepted the number; Firebase is still sending.
  assert.equal(await session.start("+84912345678"), true);
  assert.deepEqual(session.snapshot(), { step: "sending", phone: "+84912345678", autoCode: null, sendError: null });
  await assert.rejects(session.confirm("123456"), PhoneSignupStepError, "no sign-in before CODE_SENT");
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await session.delivered();
  assert.deepEqual(session.snapshot(), { step: "code-sent", phone: "+84912345678", autoCode: null, sendError: null });

  await assert.rejects(session.confirm("000000"), (error: { code?: string }) => error.code === "auth/invalid-verification-code");
  assert.equal(session.snapshot().step, "code-sent");

  const [first, second] = await Promise.all([session.confirm("123456"), session.confirm("123456")]);
  assert.equal(first, "token:v1:123456");
  assert.equal(second, first);
  assert.equal(fake.signIns(), 2, "the racing confirm reuses the in-flight sign-in");
  assert.equal(session.snapshot().step, "verified");

  await Promise.all([session.complete("PicketPassword1!"), session.complete("PicketPassword1!")]);
  assert.deepEqual(apiCalls, [
    ["start", "+84912345678"],
    ["complete", "+84912345678", "fresh-token", "PicketPassword1!"],
  ]);
  assert.deepEqual(sessions, [{ access_token: "a", refresh_token: "r" }]);
  assert.equal(session.snapshot().step, "completed");
  await new Promise((resolve) => setImmediate(resolve));
  // One before the start (stale Firebase user), one after the flow ended.
  assert.deepEqual(fake.log, ["cleanup", "cleanup"]);
});

test("API refusal stops before Firebase sends an SMS; reset clears a verified Firebase user", async () => {
  const fake = fakeDriver();
  const session = createPhoneSignupSession({
    driver: () => fake.driver,
    api: () => ({
      phoneSignupStart: () => Promise.reject(Object.assign(new Error("Phone already used."), { status: 409 })),
      phoneSignupComplete: () => Promise.reject(new Error("unused")),
    }),
    setSession: async () => undefined,
  });
  await assert.rejects(session.start("+84912345678"), (error: { status?: number }) => error.status === 409);
  assert.equal(fake.calls.length, 0, "a refused number never reaches Firebase");
  assert.equal(session.snapshot().step, "idle");
});

test("without the Firebase native module SMS sign-up fails with operation-not-allowed", async () => {
  const session = createPhoneSignupSession({
    driver: () => null,
    api: () => ({ phoneSignupStart: async () => ({ ok: true }), phoneSignupComplete: async () => ({}) }),
    setSession: async () => undefined,
  });
  await assert.rejects(session.start("+84912345678"), (error: { code?: string }) => error.code === "auth/operation-not-allowed");
});

test("invalid tokens from the API never become a session", async () => {
  const fake = fakeDriver();
  let applied = false;
  const session = createPhoneSignupSession({
    driver: () => fake.driver,
    api: () => ({ phoneSignupStart: async () => ({ ok: true }), phoneSignupComplete: async () => ({ access_token: "a" }) }),
    setSession: async () => {
      applied = true;
    },
  });
  const started = session.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  fake.calls[0].emit({ state: "verified", verificationId: "v9", code: "999999" });
  await started;
  await session.delivered();
  assert.equal(session.snapshot().autoCode, "999999");
  await session.confirm("999999");
  await assert.rejects(session.complete("PicketPassword1!"), PhoneSignupStepError);
  assert.equal(applied, false);
  session.reset();
  assert.equal(session.snapshot().step, "idle");
  await new Promise((resolve) => setImmediate(resolve));
  // One before the start (stale Firebase user), one after the flow ended.
  assert.deepEqual(fake.log, ["cleanup", "cleanup"]);
});

const okSignupApi = () => ({
  phoneSignupStart: async () => ({ ok: true }),
  phoneSignupComplete: async () => ({ access_token: "a", refresh_token: "r" }),
});

test("Android instant verification (no code, no verificationId) uses the signed-in Firebase user", async () => {
  const fake = fakeDriver({ currentUserToken: "instant-token" });
  const completes: unknown[][] = [];
  const session = createPhoneSignupSession({
    driver: () => fake.driver,
    api: () => ({
      ...okSignupApi(),
      async phoneSignupComplete(phone: string, idToken: string, password: string) {
        completes.push([phone, idToken, password]);
        return { access_token: "a", refresh_token: "r" };
      },
    }),
    setSession: async () => undefined,
  });
  const started = session.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  fake.calls[0].emit({ state: "verified", verificationId: null, code: null });
  await started;
  await session.delivered();
  assert.deepEqual(session.snapshot(), { step: "verified", phone: "+84912345678", autoCode: null, sendError: null });
  assert.equal(fake.signIns(), 0, "no credential sign-in without a code");
  assert.equal(await session.confirm("123456"), "instant-token", "a late manual confirm reuses the instant token");
  await session.complete("PicketPassword1!");
  assert.equal(completes.length, 1);
  assert.equal(session.snapshot().step, "completed");
});

test("instant verification without a Firebase user signs in only when verificationId and code both exist", async () => {
  const withCode = fakeDriver();
  const first = createPhoneSignupSession({ driver: () => withCode.driver, api: okSignupApi, setSession: async () => undefined });
  const started = first.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  withCode.calls[0].emit({ state: "verified", verificationId: "v7", code: "777777" });
  await started;
  await first.delivered();
  // A code arrived: the normal auto-code path fills the OTP screen.
  assert.equal(first.snapshot().autoCode, "777777");

  const noUser = fakeDriver();
  const second = createPhoneSignupSession({ driver: () => noUser.driver, api: okSignupApi, setSession: async () => undefined });
  const pending = second.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  noUser.calls[0].emit({ state: "verified", verificationId: null, code: null });
  assert.equal(await pending, true);
  await second.delivered();
  // Shown on the code screen (with "Đổi số" / resend) instead of rejecting the start.
  const failed = second.snapshot();
  assert.equal(failed.step, "send-failed");
  assert.ok(failed.sendError instanceof PhoneSignupStepError && failed.sendError.code === "instant-unavailable");
  assert.equal(noUser.signIns(), 0);

  const idOnly = fakeDriver();
  const third = createPhoneSignupSession({ driver: () => idOnly.driver, api: okSignupApi, setSession: async () => undefined });
  const waiting = third.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  idOnly.calls[0].emit({ state: "verified", verificationId: "v8", code: null });
  await waiting;
  await third.delivered();
  // verificationId without a code: stay on the code step instead of a failing sign-in.
  assert.equal(third.snapshot().step, "code-sent");
  assert.equal(idOnly.signIns(), 0);
});

test("a late instant verification after CODE_SENT moves straight to the password step", async () => {
  const fake = fakeDriver({ currentUserToken: "late-token" });
  const session = createPhoneSignupSession({ driver: () => fake.driver, api: okSignupApi, setSession: async () => undefined });
  const started = session.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await started;
  await session.delivered();
  assert.equal(session.snapshot().step, "code-sent");
  fake.calls[0].emit({ state: "verified", verificationId: null, code: null });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.snapshot().step, "verified");
  assert.ok(fake.log.includes("instant:+84912345678"));
});

test("SMS password recovery: reset-start, code, reset with the new password, then Firebase cleanup", async () => {
  const fake = fakeDriver();
  const calls: unknown[][] = [];
  const session = createPhoneResetSession({
    driver: () => fake.driver,
    api: () => ({
      async phoneResetStart(phone: string) {
        calls.push(["reset-start", phone]);
        return { ok: true };
      },
      async phoneReset(phone: string, idToken: string, password: string) {
        calls.push(["reset", phone, idToken, password]);
        return { ok: true };
      },
    }),
  });
  const started = session.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await started;
  await session.delivered();
  await session.confirm("123456");
  await session.complete("PicketPassword1!");
  assert.deepEqual(calls, [
    ["reset-start", "+84912345678"],
    ["reset", "+84912345678", "fresh-token", "PicketPassword1!"],
  ]);
  assert.equal(session.snapshot().step, "completed");
  await new Promise((resolve) => setImmediate(resolve));
  // One before the start (stale Firebase user), one after the flow ended.
  assert.deepEqual(fake.log, ["cleanup", "cleanup"]);
});

test("SMS recovery keeps the verified step when the API asks for a new code", async () => {
  const fake = fakeDriver();
  const session = createPhoneResetSession({
    driver: () => fake.driver,
    api: () => ({
      phoneResetStart: async () => ({ ok: true }),
      phoneReset: () => Promise.reject(Object.assign(new Error("Request a new code first."), { status: 403 })),
    }),
  });
  const started = session.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await started;
  await session.delivered();
  await session.confirm("123456");
  await assert.rejects(session.complete("PicketPassword1!"), (error: { status?: number }) => error.status === 403);
  assert.equal(session.snapshot().step, "verified");
  session.reset();
  assert.equal(session.snapshot().step, "idle");
});

test("a Firebase error after the code screen opened becomes send-failed; resend starts over through the API", async () => {
  const fake = fakeDriver();
  const starts: string[] = [];
  const session = createPhoneSignupSession({
    driver: () => fake.driver,
    api: () => ({ ...okSignupApi(), phoneSignupStart: async (phone: string) => { starts.push(phone); return { ok: true }; } }),
    setSession: async () => undefined,
  });
  assert.equal(await session.start("+84912345678"), true);
  assert.equal(session.snapshot().step, "sending");
  assert.equal(await session.resend(), false, "no second send while Firebase is still sending");
  const quota = { code: "auth/quota-exceeded" };
  fake.calls[0].emit({ state: "error", verificationId: null, code: null, error: quota });
  await session.delivered();
  assert.deepEqual(session.snapshot(), { step: "send-failed", phone: "+84912345678", autoCode: null, sendError: quota });
  await assert.rejects(session.confirm("123456"), PhoneSignupStepError);

  assert.equal(await session.resend(), true);
  assert.deepEqual(starts, ["+84912345678", "+84912345678"], "every send passes the API start first");
  assert.equal(session.snapshot().step, "sending");
  assert.equal(session.snapshot().sendError, null);
  assert.equal(fake.calls[1].forceResend, true);
  fake.calls[1].emit({ state: "sent", verificationId: "v2", code: null });
  await session.delivered();
  assert.equal(session.snapshot().step, "code-sent");
  assert.equal(await session.confirm("123456"), "token:v2:123456");
});

test("late Firebase results of a send left with 'Đổi số' or replaced by a new start are ignored", async () => {
  const fake = fakeDriver();
  const session = createPhoneSignupSession({ driver: () => fake.driver, api: okSignupApi, setSession: async () => undefined });
  await session.start("+84912345678");
  session.reset();
  fake.calls[0].emit({ state: "error", verificationId: null, code: null, error: { code: "auth/too-many-requests" } });
  await session.delivered();
  assert.equal(session.snapshot().step, "idle", "no error shown after leaving with 'Đổi số'");

  await session.start("+84912345678");
  await session.start("+84987654321");
  fake.calls[1].emit({ state: "sent", verificationId: "old", code: null });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.snapshot().step, "sending", "the first number's CODE_SENT does not unlock the second");
  fake.calls[2].emit({ state: "sent", verificationId: "new", code: null });
  await session.delivered();
  assert.equal(session.snapshot().step, "code-sent");
  assert.equal(session.snapshot().phone, "+84987654321");
  assert.equal(await session.confirm("123456"), "token:new:123456");
});

test("a start superseded while the API answers does not open the code screen", async () => {
  const fake = fakeDriver();
  let release: () => void = () => undefined;
  const session = createPhoneSignupSession({
    driver: () => fake.driver,
    api: () => ({ ...okSignupApi(), phoneSignupStart: () => new Promise((resolve) => { release = () => resolve({ ok: true }); }) }),
    setSession: async () => undefined,
  });
  const started = session.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  session.reset();
  release();
  assert.equal(await started, false);
  assert.equal(fake.calls.length, 0, "no SMS for an abandoned start");
  assert.equal(session.snapshot().step, "idle");
});

test("a resend that loses the race to a confirm of the previous code keeps the verification", async () => {
  const fake = fakeDriver();
  let release: () => void = () => undefined;
  let calls = 0;
  const session = createPhoneSignupSession({
    driver: () => fake.driver,
    api: () => ({
      ...okSignupApi(),
      phoneSignupStart: () => {
        calls++;
        return calls === 1 ? Promise.resolve({ ok: true }) : new Promise((resolve) => { release = () => resolve({ ok: true }); });
      },
    }),
    setSession: async () => undefined,
  });
  await session.start("+84912345678");
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await session.delivered();
  const resent = session.resend();
  await new Promise((resolve) => setImmediate(resolve));
  await session.confirm("123456");
  release();
  assert.equal(await resent, false);
  assert.equal(session.snapshot().step, "verified");
  assert.equal(fake.calls.length, 1, "no new SMS once the number is verified");
});

test("a new start signs out a leftover Firebase user before Firebase sends; a resend does not", async () => {
  const fake = fakeDriver();
  const order: string[] = [];
  const driver: PhoneAuthDriver = {
    ...fake.driver,
    verifyPhoneNumber(...args) {
      order.push("send");
      fake.driver.verifyPhoneNumber(...args);
    },
    async cleanup() {
      order.push("cleanup");
    },
  };
  const session = createPhoneSignupSession({ driver: () => driver, api: okSignupApi, setSession: async () => undefined });
  await session.start("+84912345678");
  assert.deepEqual(order, ["cleanup", "send"]);
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await session.delivered();
  await session.resend();
  assert.deepEqual(order, ["cleanup", "send", "send"], "a resend keeps the flow's own state");
});

test("a failed resend keeps the code that was already sent usable", async () => {
  const fake = fakeDriver();
  const session = createPhoneSignupSession({ driver: () => fake.driver, api: okSignupApi, setSession: async () => undefined });
  await session.start("+84912345678");
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await session.delivered();
  assert.equal(await session.resend(), true);
  assert.equal(session.snapshot().step, "sending");
  const tooMany = { code: "auth/too-many-requests" };
  fake.calls[1].emit({ state: "error", verificationId: null, code: null, error: tooMany });
  await session.delivered();
  assert.deepEqual(session.snapshot(), { step: "code-sent", phone: "+84912345678", autoCode: null, sendError: tooMany });
  assert.equal(await session.confirm("123456"), "token:v1:123456", "the first SMS code still signs in");
  assert.equal(session.snapshot().sendError, null);
});