import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import test from "node:test";
import ts from "typescript";
import {createAppI18n} from "../../core/i18n/instance";
import {formatMoney} from "../../core/i18n/formatters";
import {reconciliationEn,reconciliationVi} from "../../core/i18n/reconciliation-resources";
import {reconciliationNoticeCopy} from "./reconciliation-copy";

test("confirmed reconciliation notices rerender in the selected locale without losing refresh failure",()=>{
 const notice={difference:-123456,local:true,refreshFailed:true};
 const before={...notice};
 const vi=reconciliationNoticeCopy(notice,"vi"),en=reconciliationNoticeCopy(notice,"en");
 assert.ok(vi.includes(formatMoney(123456,"vi","VND")));
 assert.ok(en.includes(formatMoney(123456,"en","VND")));
 assert.match(vi,/trên thiết bị/);assert.match(en,/on this device/);
 assert.match(en,/do not submit/);assert.match(vi,/không cần gửi lại/);
 assert.deepEqual(notice,before);
 assert.match(reconciliationNoticeCopy({...notice,difference:0,local:false,refreshFailed:false},"en"),/^Wallet reconciled\.$/);
 assert.doesNotMatch(reconciliationNoticeCopy({...notice,local:false,refreshFailed:false},"en"),/device|do not submit/);
});

test("reconciliation labels interpolate supplied names and date without translating them",async()=>{
 const i18n=createAppI18n("en");
 assert.equal(i18n.t("retryRequest",{ns:"reconciliation",date:"2026-10-24"}),"Retry request for 2026-10-24");
 assert.equal(i18n.t("selectTransaction",{ns:"reconciliation",action:"Select",title:"Cà phê",amount:"₫123"}),"Select Cà phê, ₫123");
 await i18n.changeLanguage("vi");
 assert.equal(i18n.t("selection",{ns:"reconciliation",selected:2,total:7}),"Giao dịch · đã chọn 2/7");
 for(const key of Object.keys(reconciliationVi))assert.ok(reconciliationEn[key],key);
 assert.ok(Object.keys(reconciliationVi).length>30);
});

test("reconciliation screen translates controlled UI and keeps recovery payloads and user content intact",()=>{
 const file=resolve(process.cwd(),"src/app/reconcile.tsx"),text=readFileSync(file,"utf8");
 const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n:ts.Node){
  if(ts.isJsxText(n))assert.ok(!/[À-ỹĐđ]/.test(n.text.trim()),"Raw visible copy");
  if(ts.isJsxAttribute(n)&&n.initializer&&ts.isStringLiteral(n.initializer))assert.ok(!/[À-ỹĐđ]/.test(n.initializer.text),"Raw attribute");
  if(ts.isTemplateExpression(n))assert.ok(!/[À-ỹĐđ]/.test([n.head.text,...n.templateSpans.map(s=>s.literal.text)].join("")),"Raw dynamic copy");
  if(ts.isCallExpression(n)&&n.expression.getText(source)==="tx"&&ts.isStringLiteral(n.arguments[0]))assert.ok(reconciliationEn[n.arguments[0].text],`Missing key ${n.arguments[0].text}`);
  ts.forEachChild(n,visit);
 }visit(source);
 assert.doesNotMatch(text,/formatVnd|toLocaleDateString\("vi-VN"\)|\{error\}|\{message\}/);
 assert.match(text,/reconciliationNoticeCopy/);
 assert.match(text,/sendRequest\(saved, entry.payload, entry.id\)/);
 assert.match(text,/reason:saved.reason/);
 assert.match(text,/\{item.title\}/);
 assert.doesNotMatch(text,/tx\((?:item\.title|saved\.reason|walletName)/);
});
