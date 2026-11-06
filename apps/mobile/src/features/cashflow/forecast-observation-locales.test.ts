import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {test} from "node:test";
import ts from "typescript";
import {createAppI18n} from "../../core/i18n/instance";
import {forecastObservationVi,forecastObservationEn} from "../../core/i18n/forecast-observation-resources";
test("forecast history explains manual UTC confirmations and keeps supplied wallet names intact in both languages",async()=>{
 const copy=createAppI18n("vi");assert.match(copy.t("notice",{ns:"forecastObservations"}),/UTC/);await copy.changeLanguage("en");
 assert.match(copy.t("captureNotice",{ns:"forecastObservations"}),/not included in backups/);
 assert.equal(copy.t("scope",{ns:"forecastObservations",wallets:"Ví cà phê"}),"Wallets in this saved scope: Ví cà phê");
 assert.equal(copy.t("case",{ns:"forecastObservations",day:"10/24/2026",days:7,currency:"VND"}),"Saved 10/24/2026 · 7 days · VND");
 for(const key of Object.keys(forecastObservationVi))assert.ok(forecastObservationEn[key as keyof typeof forecastObservationEn]);
});
test("capture and history screens have translated controls, privacy handling and gated access",()=>{
 for(const path of ["src/app/forecast-observations-preview.tsx","src/features/cashflow/forecast-capture-card.tsx"]){
  const text=readFileSync(resolve(process.cwd(),path),"utf8"),source=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node:ts.Node){
   if(ts.isJsxText(node))assert.ok(!/[À-ỹĐđ]/.test(node.text.trim()));
   if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer))assert.ok(!/[À-ỹĐđ]/.test(node.initializer.text));
   if(ts.isCallExpression(node)&&node.expression.getText(source)==="t"&&ts.isStringLiteral(node.arguments[0]))assert.ok(node.arguments[0].text in forecastObservationEn,node.arguments[0].text);
   ts.forEachChild(node,visit);
  }visit(source);
  assert.match(text,/__DEV__/);assert.match(text,/EXPO_PUBLIC_CASHFLOW_CLOUD_ENABLED/);assert.doesNotMatch(text,/console\.log|picketApi\./);
 }
 const screen=readFileSync(resolve(process.cwd(),"src/app/forecast-observations-preview.tsx"),"utf8");
 assert.match(screen,/setShown\(false\);setExpanded\(null\);setDraft\(null\)/);
 assert.match(screen,/result\?\.metrics&&shown/);assert.match(screen,/!draft.confirmed/);
 assert.match(screen,/key=\{session.access_token\}/);
 const storage=readFileSync(resolve(process.cwd(),"src/features/cashflow/forecast-observation-storage.ts"),"utf8");assert.match(storage,/readOfflineCache/);assert.match(storage,/writeOfflineCache/);
});
