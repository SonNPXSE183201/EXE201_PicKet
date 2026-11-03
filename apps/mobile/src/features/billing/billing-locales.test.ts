import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createAppI18n } from "../../core/i18n/instance";

test("billing notices rerender in the selected language with preserved plan", async () => {
  const i18n = createAppI18n("vi");
  assert.equal(i18n.t("activated", { ns: "billing", tier: "PLUS" }), "Đã kích hoạt gói PLUS.");
  await i18n.changeLanguage("en");
  assert.equal(i18n.t("activated", { ns: "billing", tier: "PLUS" }), "PLUS plan activated.");
  assert.match(i18n.t("restorePartial", { ns: "billing" }), /Some purchases/);
});

test("billing screen keeps controlled message keys and hides upstream error text", () => {
  const source = readFileSync("src/features/billing/play-billing-screen.tsx", "utf8");
  assert.doesNotMatch(source, /error\.message/);
  assert.match(source, /useTranslation\("billing"\)/);
  assert.match(source, /t\(message\.key/);
});
