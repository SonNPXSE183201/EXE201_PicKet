import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { transactionFormVi,transactionFormEn } from "../../core/i18n/transaction-form-resources";
import { createAppI18n } from "../../core/i18n/instance";
import { renderTransactionNotice,type TransactionNotice } from "./transaction-copy";
import { formatMoney } from "../../core/i18n/formatters";
const screens=["new.tsx","transfer.tsx","[id].tsx","[id]/refund.tsx","[id]/splits.tsx","bulk.tsx"];
test("transaction forms have vi/en copy for labels, controlled messages and accessibility",()=>{
 const keys=new Set<string>();
 for(const file of screens){
  const path=resolve(process.cwd(),"src/app/transactions",file);
  const source=ts.createSourceFile(path,readFileSync(path,"utf8"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node:ts.Node){
   function inside(callee:string){for(let p=node.parent;p;p=p.parent)if(ts.isCallExpression(p)&&p.expression.getText(source)===callee)return true;return false;}
   if(ts.isStringLiteral(node)&&/[À-ỹĐđ]/.test(node.text)&&node.text!=="đ")keys.add(node.text);
   if(ts.isStringLiteral(node)&&/[À-ỹĐđ]/.test(node.text)&&inside("Alert.alert")&&!inside("setMessage"))assert.ok(inside("tx"),`Dialog copy bypasses translation: ${file}`);
   if(ts.isJsxText(node))assert.ok(!/[À-ỹĐđ]/.test(node.text.trim()),`Visible copy bypasses translation: ${file}`);
   if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer))assert.ok(!/[À-ỹĐđ]/.test(node.initializer.text),`Attribute bypasses translation: ${file}`);
   if(ts.isJsxExpression(node)&&node.expression)assert.notEqual(node.expression.getText(source),"message",`Controlled message bypasses translation: ${file}`);
   if(ts.isCallExpression(node)&&node.expression.getText(source)==="tx"&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))keys.add(node.arguments[0].text);
   if(ts.isTemplateExpression(node))assert.ok(!/[À-ỹĐđ]/.test([node.head.text,...node.templateSpans.map(span=>span.literal.text)].join("")),`Untranslated dynamic copy: ${file}`);
   ts.forEachChild(node,visit);
  }visit(source);
 }
 for(const key of keys){assert.ok(transactionFormVi[key],`Missing Vietnamese: ${key}`);assert.ok(transactionFormEn[key],`Missing English: ${key}`);}
});
test("a visible structured error rerenders its money and language without changing the saved notice",async()=>{
 const i18n=createAppI18n("vi"),notice:TransactionNotice={key:"refundLimit",money:19000};
 const translate=(key:string,values:Record<string,string|number>)=>i18n.t(key,{...values,ns:"transactions",nsSeparator:false});
 assert.equal(renderTransactionNotice(notice,"vi",translate),`Số tiền hoàn phải từ 1 đến ${formatMoney(19000,"vi","VND")}.`);
 await i18n.changeLanguage("en");
 assert.equal(renderTransactionNotice(notice,"en",translate),`The refund amount must be from 1 to ${formatMoney(19000,"en","VND")}.`);
 assert.deepEqual(notice,{key:"refundLimit",money:19000});
 assert.equal(renderTransactionNotice("selectedCount","en",translate,{count:2}),"Selected: 2");
 assert.match(renderTransactionNotice({key:"bulkResult",values:{done:1,total:3,queued:1,failed:1}},"en",translate),/Processed 1\/3 transactions.*Waiting to sync: 1; unsuccessful: 1/);
});
test("transaction copy switches locale, handles colons and interpolates counts without translating input",async()=>{
 const i18n=createAppI18n("vi");
 const input="Quán cơm: bữa trưa của Sơn";
 assert.equal(i18n.t("Ví dụ: Ăn trưa",{ns:"transactions",nsSeparator:false}),"Ví dụ: Ăn trưa");
 await i18n.changeLanguage("en");
 assert.equal(i18n.t("Ví dụ: Ăn trưa",{ns:"transactions",nsSeparator:false}),"Example: Lunch");
 assert.equal(i18n.t("selectedCount",{ns:"transactions",count:3}),"Selected: 3");
 assert.equal(i18n.t("receiptImage",{ns:"transactions",merchant:input}),"Receipt image: Quán cơm: bữa trưa của Sơn");
});
