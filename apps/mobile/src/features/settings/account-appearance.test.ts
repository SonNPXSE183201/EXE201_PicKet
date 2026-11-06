import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAppearance } from "./device-settings";
test("account modes support system while explicit device values win",()=>{
 assert.deepEqual(resolveAppearance({version:1},{themeMode:"dark",languageMode:"en",locale:"vi"},{theme:"light",locale:"vi"}),{theme:"dark",language:"en"});
 assert.deepEqual(resolveAppearance({version:1},{themeMode:"system",languageMode:"system",locale:"vi"},{theme:"dark",locale:"en"}),{theme:"dark",language:"en"});
 assert.deepEqual(resolveAppearance({version:1,themeMode:"light",languageMode:"vi"},{themeMode:"dark",languageMode:"en"},{theme:"dark",locale:"en"}),{theme:"light",language:"vi"});
});
