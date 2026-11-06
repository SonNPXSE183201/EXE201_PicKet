import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Android splash explicitly uses the Picket artwork at a bounded centered size",()=>{
  const config=JSON.parse(readFileSync(new URL("../../../app.json",import.meta.url),"utf8"));
  const plugin=config.expo.plugins.find((entry:unknown)=>Array.isArray(entry)&&entry[0]==="expo-splash-screen");
  assert.ok(plugin);
  assert.equal(plugin[1].image,"./assets/picket-logo.png");
  assert.equal(plugin[1].resizeMode,"contain");
  // A square artwork must fit inside Android's 192dp circular mask.
  assert.ok(plugin[1].imageWidth>0&&plugin[1].imageWidth<=128);
});
