import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
const require=createRequire(import.meta.url);
const {configureManifest}=require("../../../plugins/with-play-store-build.js");
type Manifest={ $?:Record<string,string>; "uses-permission"?:{$:Record<string,string>}[] };
const install="android.permission.REQUEST_INSTALL_PACKAGES";

test("switching a generated Play project back to direct APK restores the APK installer capability",()=>{
  const manifest:Manifest={};
  configureManifest(manifest,true);
  assert.equal(manifest["uses-permission"]?.find(p=>p.$["android:name"]===install)?.$["tools:node"],"remove");
  configureManifest(manifest,false);
  assert.ok(!manifest["uses-permission"]?.some(p=>p.$["android:name"]===install&&p.$["tools:node"]==="remove"));
});

test("switching back to Play always removes direct installation permission without touching camera",()=>{
  const manifest:Manifest={"uses-permission":[{$:{"android:name":"android.permission.CAMERA"}}]};
  configureManifest(manifest,false);configureManifest(manifest,true);
  assert.equal(manifest["uses-permission"]?.find(p=>p.$["android:name"]===install)?.$["tools:node"],"remove");
  assert.ok(manifest["uses-permission"]?.some(p=>p.$["android:name"]==="android.permission.CAMERA"&&!p.$["tools:node"]));
});
