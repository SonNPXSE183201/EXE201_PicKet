import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAppI18n } from "../../core/i18n/instance";
import { planningVi, planningEn } from "../../core/i18n/planning-resources";

test("planning controls and interpolated spending change language without translating budget names", async () => {
  const i18n = createAppI18n("vi");
  assert.deepEqual(Object.keys(planningVi).sort(), Object.keys(planningEn).sort());
  for (const key of Object.keys(planningVi)) assert.ok(i18n.exists(key, { ns: "planning" }));
  assert.equal(i18n.t("title", { ns: "planning" }), "Kế hoạch ngân sách");
  await i18n.changeLanguage("en");
  for (const key of Object.keys(planningEn)) assert.ok(i18n.exists(key, { ns: "planning" }));
  assert.equal(i18n.t("title", { ns: "planning" }), "Budget planning");
  assert.equal(i18n.t("budgetSummary", { ns: "planning", planned: "₫1,000", actual: "—" }), "Planned ₫1,000 · Actual —");
});

test("planning keeps incomplete spending hidden and preserves month-close checks while localizing errors", () => {
  const source = readFileSync("src/app/planning.tsx", "utf8");
  assert.match(source, /useTranslation\("planning"\)/);
  assert.match(source, /parsePaymentAmount\(amount\)/);
  assert.match(source, /\{t\(message\)\}/);
  assert.match(source, /splitLoading \|\| splitError \? "—" : money\(spent\)/);
  assert.match(source, /historyLoading \|\| historyError \|\| splitLoading \|\| splitError/);
  assert.doesNotMatch(source, /formatVnd|\{historyError\}|\{splitError\}|t\(budget\.name\)/);
});
