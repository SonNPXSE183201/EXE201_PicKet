import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function harness(){
 let instant=Date.parse("2026-09-30T16:59:00Z"),slot:unknown,cleanup:(()=>void)|undefined,tick:(()=>void)|undefined,resume:((state:string)=>void)|undefined,cleared=0,removed=0;
 class Clock extends Date {constructor(){super(instant);}static now(){return instant;}}
 const exports:{useReminderCalendar?:()=>{month:string;day:string}}={};
 const source=readFileSync(new URL("./use-reminder-calendar.ts",import.meta.url),"utf8");
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{
 exports,Date:Clock,setInterval:(fn:()=>void)=>{tick=fn;return 1;},clearInterval:()=>{cleared++;},
 require:(id:string)=>id==="react"?{useState:(initial:()=>unknown)=>{slot??=initial();return [slot,(value:unknown)=>{slot=typeof value==="function"?value(slot):value;}];},useEffect:(fn:()=>()=>void)=>{cleanup??=fn();}}:{AppState:{addEventListener:(_event:string,fn:(s:string)=>void)=>{resume=fn;return {remove:()=>{removed++;}};}}},
 });
 return {render:()=>exports.useReminderCalendar!(),advance:(value:string)=>{instant=Date.parse(value);},tick:()=>tick!(),resume:(state:string)=>resume!(state),stop:()=>cleanup!(),counts:()=>({cleared,removed})};
}
test("reminder calendar refreshes across midnight and on foreground with cleanup",()=>{
 const previous=process.env.TZ;try{process.env.TZ="Asia/Ho_Chi_Minh";const app=harness();assert.equal(app.render().month,"2026-09");
 app.advance("2026-09-30T18:00:00Z");app.tick();assert.equal(app.render().month,"2026-10");assert.equal(app.render().day,"2026-10-01");
 app.advance("2026-10-02T18:00:00Z");app.resume("active");assert.equal(app.render().day,"2026-10-03");app.stop();assert.deepEqual(app.counts(),{cleared:1,removed:1});
 }finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test("reminder clock does not replace the calendar snapshot on every minute",()=>{
 const app=harness();const first=app.render();app.advance("2026-09-30T16:59:30Z");app.tick();assert.equal(app.render(),first);
});
