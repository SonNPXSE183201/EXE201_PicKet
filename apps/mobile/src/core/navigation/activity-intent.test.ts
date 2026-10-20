import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { latestInitialNativeIntent } from "./bootstrap-intent";

test("latest Activity VIEW cannot be overwritten by stale Expo cache after recreation", () => {
  assert.equal(latestInitialNativeIntent("com.picket.mobile://","com.picket.mobile://transactions/bulk"),"com.picket.mobile://transactions/bulk");
  assert.equal(latestInitialNativeIntent("launcher",null),"launcher");
  const source=readFileSync(new URL("../../app/+native-intent.ts",import.meta.url),"utf8");
  assert.doesNotMatch(source,/getLinkingURL/);
});
test("current Activity intent fix is registered and idempotent across prebuild", () => {
  const config=JSON.parse(readFileSync(new URL("../../../app.json",import.meta.url),"utf8"));
  assert.ok(config.expo.plugins.includes("./plugins/with-current-activity-intent"));
  const require=createRequire(import.meta.url);
  const { injectCurrentActivityIntent }=require("../../../plugins/with-current-activity-intent.js") as {injectCurrentActivityIntent(source:string):string};
  const sample="package com.picket.mobile\n\nclass MainActivity : ReactActivity() {\n}";
  const modified=injectCurrentActivityIntent(sample);
  assert.equal(injectCurrentActivityIntent(modified),modified);
  assert.equal((modified.match(/override fun onNewIntent/g)??[]).length,1);
  assert.ok(modified.indexOf("setIntent(intent)")<modified.indexOf("super.onNewIntent(intent)"));
  assert.match(modified,/import android\.content\.Intent/);
  assert.throws(()=>injectCurrentActivityIntent("class Other {}"),/MainActivity/);
  assert.throws(()=>injectCurrentActivityIntent(sample.replace("\n}","\n override fun onNewIntent(intent: Intent) { super.onNewIntent(intent) }\n}")),/existing/);
});
