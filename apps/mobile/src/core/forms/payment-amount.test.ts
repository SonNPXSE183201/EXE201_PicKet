import assert from "node:assert/strict";
import test from "node:test";
const modulePath = "./payment-form";
test("payment amount parser enforces the shared API cap for create and edit controls", async () => {
  const { parsePaymentAmount } = await import(modulePath);
  for (const input of ["0", "-1", "+1", "1.5", "1e3", "1,000", " 1 ", "", "9000000000001", "9007199254740992"]) assert.equal(parsePaymentAmount(input), null);
  assert.equal(parsePaymentAmount("1"), 1);
  assert.equal(parsePaymentAmount("000100"), 100);
  assert.equal(parsePaymentAmount("9000000000000"), 9000000000000);
});
