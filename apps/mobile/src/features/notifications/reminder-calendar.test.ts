import {reminderLabel} from "./notification-copy";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const source=readFileSync(new URL("./reminders.ts",import.meta.url),"utf8");
const code=source.slice(source.indexOf("function reminderDate("),source.indexOf("export function collectReminders"));
const exports:{notify?:(date:string,days:number)=>Date|null}={};
vm.runInNewContext(ts.transpileModule(code+'\nexports.notify=notifyDate;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,Date});
test("date-only reminders retain their calendar day at 9am across device timezones",()=>{
 const previous=process.env.TZ;
 try {for(const zone of ["Asia/Ho_Chi_Minh","America/Los_Angeles","Pacific/Kiritimati"]){
  process.env.TZ=zone;
  const date=exports.notify!("2030-03-11",1);assert.ok(date,zone);
  assert.deepEqual([date.getFullYear(),date.getMonth()+1,date.getDate(),date.getHours()],[2030,3,10,9],zone);
 }}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test("explicit timestamp reminders keep instant-to-local-date semantics",()=>{
 const previous=process.env.TZ;try{process.env.TZ="America/Los_Angeles";
  const date=exports.notify!("2030-03-11T02:00:00Z",0);assert.ok(date);
  assert.deepEqual([date.getMonth()+1,date.getDate(),date.getHours()],[3,10,9]);
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test("date-only bill labels do not shift with the device timezone",()=>{
 const previous=process.env.TZ;try{process.env.TZ="America/Los_Angeles";
  assert.equal(reminderLabel("bill","Rent","2030-03-11","en"),"Rent · due 03/11/2030");
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
