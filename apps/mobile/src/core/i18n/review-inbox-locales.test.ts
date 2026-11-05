import assert from "node:assert/strict";
import { test } from "node:test";
import { commonEn, commonVi } from "./common-resources";
import { createAppI18n } from "./instance";

test("common translations cover every Vietnamese key", () => {
  for (const key of Object.keys(commonVi) as (keyof typeof commonVi)[]) {
    assert.ok(commonEn[key], `Missing English translation: ${key}`);
  }
});

test("receipt review accessibility text interpolates in both languages", async () => {
  const i18n = createAppI18n("en");
  const key = "{{title}}, hóa đơn cần kiểm tra, {{amount}}";
  assert.equal(i18n.t(key, { ns: "common", title: "Shop", amount: "100" }), "Shop, receipt to review, 100");
  await i18n.changeLanguage("vi");
  assert.equal(i18n.t(key, { ns: "common", title: "Shop", amount: "100" }), "Shop, hóa đơn cần kiểm tra, 100");
});
