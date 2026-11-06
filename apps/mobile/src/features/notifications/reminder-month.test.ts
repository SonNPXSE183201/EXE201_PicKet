import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
test("all reminder consumers select the local calendar month at a UTC boundary",()=>{
 const RealDate=Date;
 class BoundaryDate extends RealDate {constructor(){super("2026-09-30T18:00:00Z");}getFullYear(){return 2026;}getMonth(){return 9;}}
 for(const path of ["./reminders.ts"]){
  const source=readFileSync(new URL(path,import.meta.url),"utf8");
  const expression=source.match(/const month = ([^;]+);/)?.[1];assert.ok(expression,path);
  assert.equal(vm.runInNewContext(expression,{Date:BoundaryDate,at:new BoundaryDate()}),"2026-10",path);
 }
});

test("screen and coordinator use the refreshing reminder calendar",()=>{for(const path of ["../../app/notifications.tsx","./reminder-coordinator.tsx"]){const source=readFileSync(new URL(path,import.meta.url),"utf8");assert.match(source,/const calendar = useReminderCalendar\(\)/);assert.match(source,/const month = calendar.month/);assert.match(source,/calendar.now/);}});
