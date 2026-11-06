import assert from "node:assert/strict";
import { test } from "node:test";
import { vi, en } from "./resources";
import { createAppI18n } from "./instance";
test("both languages contain identical keys and named placeholders", () => {
  assert.deepEqual(Object.keys(vi).sort(), Object.keys(en).sort());
  for (const key of Object.keys(vi) as (keyof typeof vi)[]) {
    const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map(m => m[1]).sort();
    assert.deepEqual(placeholders(vi[key]), placeholders(en[key]), key);
  }
});
test("offline instances pluralize and change language without sharing state", async () => {
  const a = createAppI18n("en"), b = createAppI18n("vi");
  assert.equal(a.t("items", { count: 1 }), "1 transaction");
  assert.equal(a.t("items", { count: 0 }), "0 transactions");
  assert.equal(a.t("items", { count: 3 }), "3 transactions");
  await a.changeLanguage("vi");
  assert.equal(a.t("items", { count: 1 }), "1 giao dịch");
  assert.equal(b.language, "vi");
  assert.equal(a.t("greeting", { name: "<Sample>" }), "Xin chào, <Sample>");
});
