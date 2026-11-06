import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {scheduleOwnedReminder} from "./budget-notice-delivery";
test("native batch prioritizes the earliest 50 notification times without changing input",async()=>{
 const source=readFileSync(new URL("./reminders.ts",import.meta.url),"utf8");
 const code=source.slice(source.indexOf("async function scheduleNow("),source.indexOf("export async function purgeRetiredOwnerPreferences"));
 const calls:string[]=[],exports:{run?:(owner:string,items:unknown[],current:()=>boolean,language:string)=>Promise<void>}={};
 vm.runInNewContext(ts.transpileModule(code+'\nexports.run=scheduleNow;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{
  exports,Date,cancelUserReminders:async()=>{},storedRemindersEnabled:async()=>true,prefix:()=>"owner:",privateReminderCopy:()=>({title:"Reminder",body:"Private",channel:"Reminders"}),scheduleOwnedReminder,
  Notifications:{AndroidImportance:{DEFAULT:1},AndroidNotificationVisibility:{PRIVATE:0},SchedulableTriggerInputTypes:{DATE:"date"},setNotificationChannelAsync:async()=>{},scheduleNotificationAsync:async(value:{identifier:string})=>{calls.push(value.identifier);},cancelScheduledNotificationAsync:async()=>{}},budgetNoticeDelivery:{deliver:async()=>{}},
 });
 const base=Date.now()+86400000;
 const items=Array.from({length:51},(_,index)=>({id:String(index),notifyAt:new Date(base+(51-index)*60000)}));
 const original=items.map(item=>item.id);
 await exports.run!("owner",items,()=>true,"en");
 assert.equal(calls.length,50);
 assert.equal(calls[0],"owner:50");
 assert.equal(calls.at(-1),"owner:1");
 assert.deepEqual(items.map(item=>item.id),original);
});
