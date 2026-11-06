import assert from "node:assert/strict";
import { test } from "node:test";
import { parseDeviceSettings,resolveAppearance } from "./device-settings";
test("a language introduced by a newer app does not invalidate other device preferences",()=>{
 const settings=parseDeviceSettings('{"version":1,"themeMode":"dark","languageMode":"fr","colorSchemeId":"ocean"}');
 assert.equal(settings.languageMode,"fr");
 assert.equal(settings.themeMode,"dark");
 assert.equal(resolveAppearance(settings,{}, {theme:"light",locale:"en"}).language,"vi");
 assert.throws(()=>parseDeviceSettings('{"version":1,"languageMode":"../invalid"}'));
 assert.equal(parseDeviceSettings('{"version":1,"colorSchemeId":"forest"}').colorSchemeId,"forest");
 assert.throws(()=>parseDeviceSettings('{"version":1,"colorSchemeId":"../invalid"}'));
});
