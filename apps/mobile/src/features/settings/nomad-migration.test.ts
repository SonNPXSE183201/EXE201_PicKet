import assert from "node:assert/strict";
import test from "node:test";
import { createSettingsStore, resolveSettingsScheme } from "./device-settings";

test("first install defaults to Paper/system and persists before exposing settings", async () => {
  let saved: string | null = null;
  const store = createSettingsStore({ read: async () => saved, write: async value => { saved = value; }, isExistingInstall: async () => false });
  assert.deepEqual(await store.load(), { version: 1, colorSchemeId: "paper", themeMode: "system" });
  assert.equal(JSON.parse(saved!).colorSchemeId, "paper");
});
test("legacy install retains account defaults or Paper without forcing a new mode", async () => {
  const store = createSettingsStore({ read: async () => null, write: async () => {}, isExistingInstall: async () => true });
  const settings = await store.load();
  assert.equal(resolveSettingsScheme(settings, {}), "paper");
  assert.equal(resolveSettingsScheme(settings, { colorSchemeId: "ocean" }), "ocean");
  assert.equal(settings.themeMode, undefined);
});
test("existing preferences and unknown IDs survive migration without any rewrite", async () => {
  let writes = 0;
  const store = createSettingsStore({ read: async () => '{"version":1,"colorSchemeId":"future-theme","languageMode":"en","themeMode":"dark"}', write: async () => { writes++; }, isExistingInstall: async () => false });
  const value = await store.load();
  assert.equal(value.colorSchemeId, "future-theme");
  assert.equal(resolveSettingsScheme(value, { colorSchemeId: "rose" }), "paper");
  assert.equal(value.languageMode, "en");
  assert.equal(writes, 0);
});
test("failed initial persistence or history lookup fails safely without overwriting settings", async () => {
  const store = createSettingsStore({ read: async () => null, write: async () => { throw Error("disk"); }, isExistingInstall: async () => false });
  await assert.rejects(store.load(), /disk/);
  let writes = 0;
  const unknown = createSettingsStore({ read: async () => null, write: async () => { writes++; }, isExistingInstall: async () => { throw Error("history"); } });
  await assert.rejects(unknown.load(), /history/);
  assert.equal(writes, 0);
});
