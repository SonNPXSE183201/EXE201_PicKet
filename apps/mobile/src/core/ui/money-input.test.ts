import assert from "node:assert/strict";
import test from "node:test";
import { formatMoneyInput, normalizeMoneyInput } from "./money-input";

test("groups VND digits without losing precision or changing empty drafts", () => {
  assert.equal(formatMoneyInput("1234567890"), "1.234.567.890");
  assert.equal(formatMoneyInput(""), "");
  assert.equal(formatMoneyInput("0"), "0");
  assert.equal(formatMoneyInput("-123456"), "-123.456");
  assert.equal(formatMoneyInput("9007199254740993"), "9.007.199.254.740.993");
});
test("accepts grouped pasted VND and keeps invalid drafts for validation", () => {
  assert.equal(normalizeMoneyInput("1.234.567"), "1234567");
  assert.equal(normalizeMoneyInput("1,234,567"), "1234567");
  assert.equal(normalizeMoneyInput("12 345"), "12345");
  assert.equal(normalizeMoneyInput("12abc"), "12abc");
  assert.equal(formatMoneyInput("12abc"), "12abc");
});
