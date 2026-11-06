import assert from "node:assert/strict";
import { test } from "node:test";
import { createSettingsStore, parseDeviceSettings, resolveAppearance } from "./device-settings";

test("device overrides account; account overrides system and locale normalizes", () => {
  assert.deepEqual(resolveAppearance({ version: 1, themeMode: "dark", languageMode: "en" }, { theme: "light", locale: "vi-VN" }, { theme: "light", locale: "vi" }), { theme: "dark", language: "en" });
  assert.deepEqual(resolveAppearance({ version: 1 }, { theme: "dark", locale: "en-US" }, { theme: "light", locale: "vi" }), { theme: "dark", language: "en" });
  assert.deepEqual(resolveAppearance({ version: 1, themeMode: "system", languageMode: "system" }, { theme: "dark", locale: "en" }, { theme: "light", locale: "vi-VN" }), { theme: "light", language: "vi" });
});
test("missing settings migrate safely; corrupt/future settings are not overwritten", () => {
  assert.deepEqual(parseDeviceSettings(null), { version: 1 });
  assert.throws(() => parseDeviceSettings('{"version":99}'));
  assert.throws(() => parseDeviceSettings('{"version":1,"themeMode":"neon"}'));
});
test("serialized device writes preserve order and a failed write can retry", async () => {
  let value: string | null = null; let fail = true;
  const store = createSettingsStore({ read: async () => value, write: async next => { if (fail) { fail = false; throw Error("disk"); } value = next; } });
  await assert.rejects(store.save({ version: 1, themeMode: "dark" }));
  await store.save({ version: 1, themeMode: "light" });
  const writes = [store.save({ version: 1, languageMode: "vi" }), store.save({ version: 1, languageMode: "en" })];
  await Promise.all(writes);
  assert.equal((await store.load()).languageMode, "en");
});
