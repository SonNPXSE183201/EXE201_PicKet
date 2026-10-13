import assert from "node:assert/strict";
import test from "node:test";

import { validatePassword } from "./auth-errors";

test("requires the password policy enforced by production auth", () => {
  assert.equal(validatePassword("Short1!"), "Mật khẩu cần ít nhất 12 ký tự.");
  assert.equal(
    validatePassword("PicketPassword2026"),
    "Mật khẩu cần chữ hoa, chữ thường, chữ số và ký tự đặc biệt.",
  );
  assert.equal(validatePassword("PicketPassword!2026"), null);
});
