import assert from "node:assert/strict";
import test from "node:test";

import { createEmailCodeDelivery, emailCodeErrorFor, emailCodeStateFor } from "./email-code-delivery";
import { initialOtpState, otpReducer, shouldAutoSubmitOtp, type OtpState } from "./otp-state";
import { createSignupVerificationLoader, emailOnlyVerification, shownSignupMethod, type SignupChannelsStorage } from "./signup-channels";

const typed = (value: string): OtpState => otpReducer(initialOtpState(0), { type: "input", value });

test("auto-submit fires on the 6th digit once per code and only after the code was sent", () => {
  assert.equal(shouldAutoSubmitOtp(typed("12345"), true, null), false);
  assert.equal(shouldAutoSubmitOtp(typed("123456"), false, null), false, "still sending: wait for CODE_SENT");
  assert.equal(shouldAutoSubmitOtp(typed("123456"), true, null), true);

  // The refused code stays in the boxes: no automatic retry of the same code.
  let state = otpReducer(typed("123456"), { type: "submit" });
  assert.equal(shouldAutoSubmitOtp(state, true, "123456"), false, "not while verifying");
  state = otpReducer(state, { type: "wrongCode" });
  assert.equal(state.status, "editing");
  assert.equal(shouldAutoSubmitOtp(state, true, "123456"), false);
  // Editing to a different 6-digit code (or pasting one) submits again.
  state = otpReducer(state, { type: "input", value: "123457" });
  assert.equal(shouldAutoSubmitOtp(state, true, "123456"), true);
  // Locked after too many attempts: nothing submits until a resend.
  const locked: OtpState = { ...state, status: "locked" };
  assert.equal(shouldAutoSubmitOtp(locked, true, null), false);
});

test("email code send: the OTP screen opens while sending, then shows the result or the error", async () => {
  const delivery = createEmailCodeDelivery();
  let fail: (error: unknown) => void = () => undefined;
  let sends = 0;
  const send = () => {
    sends++;
    return new Promise<void>((_resolve, reject) => {
      fail = reject;
    });
  };
  assert.equal(delivery.start("a@picket.test", send), true);
  assert.equal(delivery.start("a@picket.test", send), false, "a double tap does not send twice");
  assert.equal(sends, 1);
  assert.equal(emailCodeStateFor(delivery.snapshot(), "a@picket.test"), "sending");
  assert.equal(emailCodeStateFor(delivery.snapshot(), "other@picket.test"), "ready", "older links are not blocked");
  const error = Object.assign(new Error("email rate limit exceeded"), { status: 429 });
  fail(error);
  await delivery.delivered();
  assert.deepEqual(delivery.snapshot(), { status: "failed", email: "a@picket.test", error });
  assert.equal(emailCodeStateFor(delivery.snapshot(), "a@picket.test"), "failed");

  let ok: () => void = () => undefined;
  delivery.start("a@picket.test", () => new Promise<void>((resolve) => {
    ok = resolve;
  }));
  ok();
  await delivery.delivered();
  assert.equal(emailCodeStateFor(delivery.snapshot(), "a@picket.test"), "ready");
});

test("email code send: a late result after 'Đổi email' or a newer send is ignored", async () => {
  const delivery = createEmailCodeDelivery();
  let failOld: (error: unknown) => void = () => undefined;
  delivery.start("old@picket.test", () => new Promise<void>((_resolve, reject) => {
    failOld = reject;
  }));
  delivery.reset();
  failOld(new Error("late"));
  await delivery.delivered();
  assert.deepEqual(delivery.snapshot(), { status: "idle", email: null, error: null });

  let finishFirst: () => void = () => undefined;
  delivery.start("a@picket.test", () => new Promise<void>((resolve) => {
    finishFirst = resolve;
  }));
  let failSecond: (error: unknown) => void = () => undefined;
  delivery.start("b@picket.test", () => new Promise<void>((_resolve, reject) => {
    failSecond = reject;
  }));
  finishFirst();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(delivery.snapshot().status, "sending");
  failSecond(new Error("bad"));
  await delivery.delivered();
  assert.equal(delivery.snapshot().status, "failed");
  assert.equal(delivery.snapshot().email, "b@picket.test");
});

function memoryStorage(initial: string | null = null) {
  const writes: string[] = [];
  let value = initial;
  const storage: SignupChannelsStorage = {
    read: async () => value,
    async write(next) {
      value = next;
      writes.push(next);
    },
  };
  return { storage, writes };
}

test("sign-up channels: the stored value renders at once and is revalidated in the background", async () => {
  const { storage, writes } = memoryStorage(JSON.stringify({ email: true, sms: true }));
  let resolveFetch: (value: unknown) => void = () => undefined;
  let fetches = 0;
  const api = {
    authChannels: () => {
      fetches++;
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    },
  };
  const loader = createSignupVerificationLoader(() => 0, 1000, storage);
  let changes = 0;
  loader.subscribe(() => changes++);
  assert.equal(loader.peek(), null);
  loader.prefetch(api);
  // The stored value is used without waiting for the network.
  assert.deepEqual(await loader(api), { email: true, sms: true });
  assert.deepEqual(loader.peek(), { email: true, sms: true });
  assert.equal(fetches, 1, "prefetch and load share one request");
  resolveFetch({ verification: { email: true, sms: false } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(loader.peek(), { email: true, sms: false }, "the fresh value replaces the stored one");
  assert.deepEqual(writes, [JSON.stringify({ email: true, sms: false })]);
  assert.ok(changes >= 2);
  assert.deepEqual(await loader(api), { email: true, sms: false });
  assert.equal(fetches, 1, "fresh within the TTL");
});

test("sign-up channels: first run without storage is email only on error, and that fallback is not stored", async () => {
  const { storage, writes } = memoryStorage();
  const loader = createSignupVerificationLoader(() => 0, 1000, storage);
  assert.deepEqual(await loader({ authChannels: () => Promise.reject(new Error("offline")) }), emailOnlyVerification);
  assert.deepEqual(loader.peek(), emailOnlyVerification);
  assert.deepEqual(writes, []);

  // A stored value survives a failed refresh (no downgrade to email only).
  const kept = memoryStorage(JSON.stringify({ email: false, sms: true }));
  const offline = createSignupVerificationLoader(() => 0, 1000, kept.storage);
  assert.deepEqual(await offline({ authChannels: () => Promise.reject(new Error("offline")) }), { email: false, sms: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(offline.peek(), { email: false, sms: true });

  // Corrupt storage is ignored.
  const corrupt = memoryStorage("{not json");
  const fresh = createSignupVerificationLoader(() => 0, 1000, corrupt.storage);
  assert.deepEqual(await fresh({ authChannels: async () => ({ verification: { email: true, sms: true } }) }), { email: true, sms: true });
});

test("email code send: a failed resend keeps the earlier code usable and reports the error", async () => {
  const delivery = createEmailCodeDelivery();
  delivery.start("a@picket.test", async () => undefined);
  await delivery.delivered();
  const limited = Object.assign(new Error("email rate limit exceeded"), { status: 429 });
  delivery.start("a@picket.test", () => Promise.reject(limited));
  assert.equal(emailCodeStateFor(delivery.snapshot(), "a@picket.test"), "sending");
  await delivery.delivered();
  assert.equal(emailCodeStateFor(delivery.snapshot(), "a@picket.test"), "ready", "the code boxes stay open");
  assert.equal(emailCodeErrorFor(delivery.snapshot(), "a@picket.test"), limited);
  assert.equal(emailCodeErrorFor(delivery.snapshot(), "b@picket.test"), null, "another address shows no error");
  // A first send that fails is still a failure (nothing to enter yet).
  delivery.start("b@picket.test", () => Promise.reject(limited));
  await delivery.delivered();
  assert.equal(emailCodeStateFor(delivery.snapshot(), "b@picket.test"), "failed");
});

test("register method: a channel refresh does not switch the form shown to the user", () => {
  // Cached settings offered SMS only: the form shows phone and keeps it as the choice.
  const shown = shownSignupMethod("email", ["phone"]);
  assert.equal(shown, "phone");
  assert.equal(shownSignupMethod(shown, ["email", "phone"]), "phone");
  assert.equal(shownSignupMethod("phone", ["email"]), "email", "a method no longer offered falls back");
});