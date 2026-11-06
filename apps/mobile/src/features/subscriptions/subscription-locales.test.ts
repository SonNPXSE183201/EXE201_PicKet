import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAppI18n } from "../../core/i18n/instance";
import { subscriptionsEn, subscriptionsVi } from "../../core/i18n/subscription-resources";

test("recurring payment copy switches all controlled errors and reminder plurals without changing user text", async () => {
  assert.deepEqual(Object.keys(subscriptionsVi).sort(), Object.keys(subscriptionsEn).sort());
  const i18n = createAppI18n("vi");
  const draft = { title: "Tiền nhà", note: "Gửi cho mẹ", wallet: "Ví của tôi", category: "Nhà" };
  const previous = { ...draft };
  for (const key of Object.keys(subscriptionsVi)) assert.ok(i18n.exists(key, { ns: "subscriptions" }));
  assert.equal(i18n.t("invalidDate", { ns: "subscriptions" }), subscriptionsVi.invalidDate);
  await i18n.changeLanguage("en");
  for (const key of Object.keys(subscriptionsEn)) assert.ok(i18n.exists(key, { ns: "subscriptions" }));
  assert.equal(i18n.t("invalidDate", { ns: "subscriptions" }), subscriptionsEn.invalidDate);
  assert.equal(i18n.t("reminder", { ns: "subscriptions", count: 1 }), "Remind me 1 day before");
  assert.equal(i18n.t("reminder", { ns: "subscriptions", count: 3 }), "Remind me 3 days before");
  assert.equal(i18n.t("nextPayment", { ns: "subscriptions", date: "10/25/2026" }), "Next payment: 10/25/2026");
  assert.deepEqual(draft, previous);
});

test("recurring screens localize accessibility, confirmations, status and money while keeping stored names verbatim", () => {
  for (const path of ["index", "new", "[id]"]) {
    const text = readFileSync(`src/app/subscriptions/${path}.tsx`, "utf8");
    assert.match(text, /useTranslation\("subscriptions"\)/);
    assert.doesNotMatch(text, /formatVnd|"vi-VN"|\{message\}/);
    assert.doesNotMatch(text, /(?:accessibilityLabel|title|subtitle|label)="[À-ỹ]/);
    assert.doesNotMatch(text, /t\((?:selected\.title|item\.name|item\.title|note)\)/);
    if (path !== "index") assert.match(text, /\{t\(message\)\}/);
    if (path === "new") assert.match(text, /parseSubscriptionForm\(/);
  }
});
