import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAppI18n } from "../../core/i18n/instance";
import { billsVi, billsEn } from "../../core/i18n/bill-resources";
import { formatMoney, normalizeLanguage } from "../../core/i18n/formatters";

test("bill copy and visible validation errors switch language without translating the user's draft", async () => {
  assert.deepEqual(Object.keys(billsVi).sort(), Object.keys(billsEn).sort());
  const i18n = createAppI18n("vi");
  const draft = { title: "Tiền điện của mẹ", amount: "250000", dueDate: "2026-10-25" };
  const before = { ...draft };
  const error = "invalidDate";
  for (const key of Object.keys(billsVi)) assert.ok(i18n.exists(key, { ns: "bills" }));
  assert.equal(i18n.t(error, { ns: "bills" }), billsVi.invalidDate);
  const moneyVi = formatMoney(250000, normalizeLanguage(i18n.language), "VND");
  await i18n.changeLanguage("en");
  for (const key of Object.keys(billsEn)) {
    assert.ok(i18n.exists(key, { ns: "bills" }));
    assert.equal(typeof i18n.t(key, { ns: "bills" }), "string");
  }
  assert.equal(i18n.t(error, { ns: "bills" }), billsEn.invalidDate);
  assert.equal(i18n.t("archiveTitle", { ns: "bills" }), "Archive this bill?");
  assert.notEqual(formatMoney(250000, normalizeLanguage(i18n.language), "VND"), moneyVi);
  assert.deepEqual(draft, before);
});

test("bill form and edit date round-trip use local calendar days on both sides of UTC", () => {
  const script = `const assert=require('node:assert/strict');
    const {parseBillForm,billDateInput,initialBillDueDate}=require('./src/features/bills/bill-form.ts');
    const parsed=parseBillForm({title:'Electricity',amount:'100',dueDate:'2028-02-29'});
    assert.ok(parsed.value);assert.equal(billDateInput(parsed.value.dueAt),'2028-02-29');
    assert.equal(new Date(parsed.value.dueAt).getHours(),12);
    assert.equal(initialBillDueDate(new Date(2026,9,31,0,15)),'2026-11-07');
    assert.deepEqual(parseBillForm({title:'X',amount:'1',dueDate:'2026-02-31'}),{error:'invalidDate'});`;
  for (const TZ of ["Asia/Ho_Chi_Minh", "America/Los_Angeles", "Pacific/Kiritimati"]) {
    execFileSync(process.execPath, ["--import", "tsx", "--eval", script], { env: { ...process.env, TZ }, stdio: "pipe" });
  }
});

test("bill screens wire translated labels, live errors and shared validation without translating stored text", () => {
  for (const path of ["index", "new", "[id]"]) {
    const source = readFileSync(`src/app/bills/${path}.tsx`, "utf8");
    assert.match(source, /useTranslation\("bills"\)/);
    assert.doesNotMatch(source, /(?:accessibilityLabel|title|subtitle|label)="[À-ỹ]/);
    assert.doesNotMatch(source, /formatVnd|"vi-VN"/);
    if (path !== "index") {
      assert.match(source, /parseBillForm\(/);
      assert.match(source, /accessibilityLiveRegion="polite"/);
      assert.match(source, /\{t\(message\)\}/);
      assert.doesNotMatch(source, /t\((?:currentTitle|title)\)/);
    }
  }
});
