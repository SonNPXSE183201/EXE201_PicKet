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
    async refreshIdToken() {
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
  const started = session.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  fake.calls[0].emit({ state: "sent", verificationId: "v1", code: null });
  await started;
  assert.deepEqual(session.snapshot(), { step: "code-sent", phone: "+84912345678", autoCode: null });

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
  assert.deepEqual(fake.log, ["cleanup"]);
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
  assert.equal(fake.calls.length, 0);
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
  assert.equal(session.snapshot().autoCode, "999999");
  await session.confirm("999999");
  await assert.rejects(session.complete("PicketPassword1!"), PhoneSignupStepError);
  assert.equal(applied, false);
  session.reset();
  assert.equal(session.snapshot().step, "idle");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(fake.log, ["cleanup"]);
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
  assert.deepEqual(session.snapshot(), { step: "verified", phone: "+84912345678", autoCode: null });
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
  // A code arrived: the normal auto-code path fills the OTP screen.
  assert.equal(first.snapshot().autoCode, "777777");

  const noUser = fakeDriver();
  const second = createPhoneSignupSession({ driver: () => noUser.driver, api: okSignupApi, setSession: async () => undefined });
  const pending = second.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  noUser.calls[0].emit({ state: "verified", verificationId: null, code: null });
  await assert.rejects(pending, (error: { code?: string }) => error instanceof PhoneSignupStepError && error.code === "instant-unavailable");
  assert.equal(second.snapshot().step, "idle");
  assert.equal(noUser.signIns(), 0);

  const idOnly = fakeDriver();
  const third = createPhoneSignupSession({ driver: () => idOnly.driver, api: okSignupApi, setSession: async () => undefined });
  const waiting = third.start("+84912345678");
  await new Promise((resolve) => setImmediate(resolve));
  idOnly.calls[0].emit({ state: "verified", verificationId: "v8", code: null });
  await waiting;
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
  await session.confirm("123456");
  await session.complete("PicketPassword1!");
  assert.deepEqual(calls, [
    ["reset-start", "+84912345678"],
    ["reset", "+84912345678", "fresh-token", "PicketPassword1!"],
  ]);
  assert.equal(session.snapshot().step, "completed");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(fake.log, ["cleanup"]);
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
  await session.confirm("123456");
  await assert.rejects(session.complete("PicketPassword1!"), (error: { status?: number }) => error.status === 403);
  assert.equal(session.snapshot().step, "verified");
  session.reset();
  assert.equal(session.snapshot().step, "idle");
});
