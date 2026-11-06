import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@supabase/supabase-js";
import { authErrorMessage } from "./auth-errors";
import { pendingPhone, phoneSignInTokens } from "./phone-sign-in";

const failing = (status: number) => ({ phoneLogin: async () => { throw Object.assign(new Error("x"), { status }); } });

test("phone sign-in returns only the tokens needed for setSession", async () => {
  const tokens = await phoneSignInTokens({ phoneLogin: async () => ({ access_token: "a", refresh_token: "r", user: { id: "u" } } as never) }, "+84912345678", "pw");
  assert.deepEqual(tokens, { access_token: "a", refresh_token: "r" });
});

test("wrong phone or password shows the same message as email login", async () => {
  await assert.rejects(phoneSignInTokens(failing(401), "+84912345678", "pw"), (error) => {
    assert.ok(error instanceof AuthError);
    assert.equal(authErrorMessage(error), "Email, số điện thoại hoặc mật khẩu không đúng.");
    return true;
  });
  await assert.rejects(phoneSignInTokens(failing(429), "+84912345678", "pw"), (error) => {
    assert.equal(authErrorMessage(error), "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.");
    return true;
  });
  await assert.rejects(phoneSignInTokens(null, "+84912345678", "pw"), AuthError);
});

test("a pending sign-up phone is read only when well formed", () => {
  assert.equal(pendingPhone({ user_metadata: { pending_phone: "+84912345678" } }), "+84912345678");
  assert.equal(pendingPhone({ user_metadata: { pending_phone: "0912" } }), null);
  assert.equal(pendingPhone(null), null);
});
