import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAppI18n } from "../../core/i18n/instance";
import { budgetsVi, budgetsEn } from "../../core/i18n/budget-resources";

test("budget live messages and progress interpolation change language without changing user names", async () => {
  const i18n = createAppI18n("vi");
  assert.deepEqual(Object.keys(budgetsVi).sort(), Object.keys(budgetsEn).sort());
  for (const key of Object.keys(budgetsVi)) assert.ok(i18n.exists(key, { ns: "budgets" }));
  const name = "Ăn uống của mẹ";
  assert.equal(i18n.t("manageBudget", { ns: "budgets", name }), "Quản lý ngân sách Ăn uống của mẹ");
  await i18n.changeLanguage("en");
  for (const key of Object.keys(budgetsEn)) assert.ok(i18n.exists(key, { ns: "budgets" }));
  assert.equal(i18n.t("manageBudget", { ns: "budgets", name }), "Manage budget Ăn uống của mẹ");
  assert.equal(i18n.t("used", { ns: "budgets", percent: 80 }), "80% of limit used");
  assert.equal(i18n.t("queued", { ns: "budgets" }), "Saved on this device, waiting to sync.");
});

test("budget screen translates live asynchronous errors and accessible progress without changing stored data", () => {
  const source = readFileSync("src/app/budgets/index.tsx", "utf8");
  assert.match(source, /useTranslation\("budgets"\)/);
  assert.match(source, /parsePaymentAmount\(limit\)/);
  assert.match(source, /parsePaymentAmount\(editedLimit\)/);
  assert.match(source, /\{t\(periodError\)\}/);
  assert.match(source, /\{t\(splitError\)\}/);
  assert.match(source, /\{t\(message\)\}/);
  assert.doesNotMatch(source, /formatVnd|t\((?:budget\.name|category\.name|editing\.name)\)/);
});
