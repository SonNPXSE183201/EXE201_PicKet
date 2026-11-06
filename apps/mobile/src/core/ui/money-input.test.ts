import assert from "node:assert/strict";
import test from "node:test";
import { formatMoneyInput, normalizeMoneyInput, editMoneyInput } from "./money-input";
import { readFileSync } from "node:fs";

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

test("money edits preserve the caret for middle insert, paste, selection and grouped backspace", () => {
  assert.deepEqual(editMoneyInput("12.345", "129.345", { start: 2, end: 2 }), { raw: "129345", selection: { start: 3, end: 3 } });
  assert.deepEqual(editMoneyInput("1.234", "1234", { start: 2, end: 2 }), { raw: "234", selection: { start: 0, end: 0 } });
  assert.deepEqual(editMoneyInput("1.234", "1.34", { start: 3, end: 3 }), { raw: "134", selection: { start: 1, end: 1 } });
  assert.deepEqual(editMoneyInput("12.345", "12345.678", { start: 0, end: 6 }), { raw: "12345678", selection: { start: 10, end: 10 } });
  assert.deepEqual(editMoneyInput("-1.234", "-19.234", { start: 2, end: 2 }), { raw: "-19234", selection: { start: 3, end: 3 } });
});

test("new transaction rejects unsafe and above-domain amount before submission", () => {
  const form=readFileSync(new URL("../../app/transactions/new.tsx",import.meta.url),"utf8");
  assert.match(form,/!Number\.isSafeInteger\(parsedAmount\)/);
  assert.match(form,/parsedAmount > MAX_MONEY/);
});

test("transaction editor keeps restored both-kind categories selectable", () => {
  const form=readFileSync(new URL("../../app/transactions/[id].tsx",import.meta.url),"utf8");
  assert.match(form,/item\.kind === transaction\.kind \|\| item\.kind === "both"/);
});
