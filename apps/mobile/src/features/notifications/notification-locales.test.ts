import assert from "node:assert/strict";
import { test } from "node:test";
import { reminderLabel,privateReminderCopy } from "./notification-copy";
import { createBudgetNoticeDelivery } from "./budget-notice-delivery";
import { createAppI18n } from "../../core/i18n/instance";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { notificationsVi,notificationsEn } from "../../core/i18n/notification-resources";
test("notification labels localize without changing the supplied merchant title",()=>{
 const title="Tiền nhà: Sơn";
 assert.match(reminderLabel("bill",title,"2026-10-24T12:00:00Z","en"),/^Tiền nhà: Sơn · due /);
 assert.equal(reminderLabel("subscription",title,"2026-10-24","en"),"Tiền nhà: Sơn is due for payment soon");
 assert.match(reminderLabel("return",title,"2026-10-24","vi"),/sắp hết hạn đổi trả/);
 assert.match(reminderLabel("warranty",title,"2026-10-24","en"),/warranty ends soon/);
 assert.match(reminderLabel("budget",title,"2026-10-24","en"),/reached its warning threshold/);
 assert.throws(()=>reminderLabel("bill",title,"not-a-date","en"));
});
test("native copy is generic and the requested language is isolated per delivery",async()=>{
 assert.equal(privateReminderCopy("budget","en").title,"Picket · Budget");
 assert.equal(privateReminderCopy("reminder","vi").title,"Picket · Nhắc việc");
 const shown:string[]=[];
 const delivery=createBudgetNoticeDelivery<"vi"|"en">({read:async()=>[],save:async()=>undefined,show:async(owner,_id,_current,language)=>{shown.push(owner+":"+language);}});
 await Promise.all([delivery.deliver("a",["budget:food:2026-10"],()=>true,"en"),delivery.deliver("b",["budget:food:2026-10"],()=>true,"vi")]);
 await delivery.deliver("a",["budget:food:2026-10"],()=>true,"vi");
 assert.deepEqual(shown,["a:en","b:vi"]);
 assert.equal(createAppI18n("en").t("Thông báo",{ns:"notifications"}),"Notifications");
 assert.equal(privateReminderCopy("budget").title,"Picket · Ngân sách");
 assert.match(privateReminderCopy("reminder","en").body,/A payment or keepsake deadline/);
});
test("notification screen uses complete translations for visible and controlled copy",()=>{
 const source=ts.createSourceFile("notifications.tsx",readFileSync(new URL("../../app/notifications.tsx",import.meta.url),"utf8"),99,true,ts.ScriptKind.TSX);
 function visit(node:ts.Node){
  if(ts.isStringLiteral(node)&&/[À-ỹĐđ]/.test(node.text)){assert.ok(notificationsVi[node.text],node.text);assert.ok(notificationsEn[node.text],node.text);}
  if(ts.isJsxText(node))assert.ok(!/[À-ỹĐđ]/.test(node.text.trim()),"Untranslated visible notification copy");
  if(ts.isJsxAttribute(node)&&node.initializer&&ts.isStringLiteral(node.initializer))assert.ok(!/[À-ỹĐđ]/.test(node.initializer.text),"Untranslated notification attribute");
  if(ts.isJsxExpression(node)&&node.expression)assert.notEqual(node.expression.getText(source),"message");
  ts.forEachChild(node,visit);
 }visit(source);
});
