import assert from "node:assert/strict";
import test from "node:test";
import { prepareCapture } from "./capture-work";

test("recognition starts while encrypted photo persistence is still pending",async()=>{
  const events:string[]=[];let finish!:()=>void;
  const stored=new Promise<void>(resolve=>{finish=resolve;});
  const work=prepareCapture(async()=>{events.push("ocr");},async()=>{events.push("persist");await stored;return "owned-photo";});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,["ocr","persist"]);
  finish();assert.equal(await work,"owned-photo");
});

test("a persistence failure does not finish capture while recognition still owns work",async()=>{
  let finish!:()=>void;let settled=false;
  const recognition=new Promise<void>(resolve=>{finish=resolve;});
  const work=prepareCapture(()=>recognition,async()=>{throw new Error("disk-full");});
  const observed=work.catch(error=>{settled=true;return String(error);});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  finish();assert.match(await observed,/disk-full/);
});
