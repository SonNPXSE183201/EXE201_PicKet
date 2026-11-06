import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearningAiSession, type LearningAiApi } from "./ai-session";

const id="66666666-1234-4321-8123-123456789011";
function setup(overrides:Partial<LearningAiApi>={}){
  const keys:string[]=[];
  const api:LearningAiApi={
    learningAiConsent:async()=>({accepted:true,generation:1,policyVersion:1}),
    setLearningAiConsent:async(_token,accepted)=>({accepted,generation:2,policyVersion:1}),
    enqueueLearningAi:async(_token,_request,key)=>{keys.push(key);return {id,status:"queued"};},
    learningAiJob:async()=>({id,status:"completed",statementIds:["timing"]}),
    deleteLearningAiHistory:async()=>undefined,
    ...overrides,
  };
  let count=0;
  const session=createLearningAiSession(api,"token",()=>`request_${++count}`);
  return {session,keys};
}
test("explicit consent required before generation and only fixed case sent",async()=>{
  const {session,keys}=setup();
  await session.generate("vi");
  assert.equal(keys.length,0);
  await session.load();
  await session.generate("vi");
  assert.equal(keys.length,1);
  await session.poll();
  assert.deepEqual(session.snapshot().job?.statementIds,["timing"]);
});
test("uncertain enqueue retry retains same key; no automatic generation",async()=>{
  const keys:string[]=[];
  const {session}=setup({enqueueLearningAi:async(_token,request,key)=>{
    assert.deepEqual(request,{scenarioId:"cash-gap-v1",locale:"vi"});
    keys.push(key);if(keys.length===1)throw new Error("lost response");return {id,status:"queued"};
  }});
  await session.load();await session.generate("vi");
  assert.equal(session.snapshot().error,"unavailable");
  await session.generate("vi");
  assert.deepEqual(keys,["request_1","request_1"]);
});
test("revocation suppresses late model result even if transport ignores abort",async()=>{
  let complete!:(value:unknown)=>void;
  const {session}=setup({learningAiJob:()=>new Promise(resolve=>{complete=resolve;})});
  await session.load();await session.generate("vi");
  const pending=session.poll();
  await session.setConsent(false);
  complete({id,status:"completed",statementIds:["buffer"]});
  await pending;
  assert.equal(session.snapshot().job,null);
  assert.equal(session.snapshot().consent?.accepted,false);
});
test("dispose suppresses old account results and aborts its requests",async()=>{
  let complete!:(value:unknown)=>void;let signal:AbortSignal|undefined;
  const {session}=setup({learningAiConsent:(_token,current)=>{signal=current;return new Promise(resolve=>{complete=resolve;});}});
  const pending=session.load();session.dispose();
  complete({accepted:true,generation:1,policyVersion:1});await pending;
  assert.equal(signal?.aborted,true);
  assert.equal(session.snapshot().consent,null);
});
test("history deletion cancels displayed result without revoking consent",async()=>{
  const {session}=setup();await session.load();await session.generate("vi");await session.poll();
  await session.clearHistory();
  assert.equal(session.snapshot().job,null);
  assert.equal(session.snapshot().consent?.accepted,true);
});
test("malformed model prose and mismatched job IDs never display",async()=>{
  for(const result of [{id,status:"completed",statementIds:["raw prose"]},{id:"other",status:"completed",statementIds:["timing"]}]){
    const {session}=setup({learningAiJob:async()=>result});
    await session.load();await session.generate("vi");await session.poll();
    assert.equal(session.snapshot().error,"unavailable");
    assert.notEqual(session.snapshot().job?.status,"completed");
  }
});
test("quota errors preserve retry key and show dedicated status",async()=>{
  const {session}=setup({enqueueLearningAi:async()=>{throw {status:429};}});
  await session.load();await session.generate("en");
  assert.equal(session.snapshot().error,"quota");
});
test("a new effect lifetime can restart after development cleanup",async()=>{
  const {session}=setup();session.dispose();session.start();await session.load();
  assert.equal(session.snapshot().consent?.accepted,true);
});
test("same-owner token refresh preserves the pending job and updates authorization",async()=>{
  let usedToken="";
  const {session}=setup({learningAiJob:async token=>{usedToken=token;return {id,status:"completed",statementIds:["timing"]};}});
  await session.load();await session.generate("vi");
  session.setAccessToken("refreshed-token");
  assert.equal(session.snapshot().job?.id,id);
  await session.poll();assert.equal(usedToken,"refreshed-token");
});
test("deleted remote jobs stop polling and do not silently generate again",async()=>{
  let polls=0;
  const {session,keys}=setup({learningAiJob:async()=>{polls++;throw {status:404};}});
  await session.load();await session.generate("vi");await session.poll();await session.poll();
  assert.equal(session.snapshot().job?.status,"cancelled");
  assert.equal(polls,1);assert.equal(keys.length,1);
});
test("malformed consent never enables generation",async()=>{
  for(const value of [{accepted:"true",generation:1,policyVersion:1},{accepted:true,generation:-1,policyVersion:1},{accepted:true,generation:1,policyVersion:2}]){
    const {session,keys}=setup({learningAiConsent:async()=>value});
    await session.load();await session.generate("vi");
    assert.equal(session.snapshot().consent,null);assert.equal(keys.length,0);
  }
});
test("completed result refresh observes revocation or expiry from another device",async()=>{
  let revoked=false;
  const {session}=setup({learningAiJob:async()=>revoked?{id,status:"cancelled",statementIds:[]}:{id,status:"completed",statementIds:["timing"]}});
  await session.load();await session.generate("vi");await session.poll();
  assert.equal(session.snapshot().job?.status,"completed");
  revoked=true;await session.poll();
  assert.equal(session.snapshot().job?.status,"cancelled");
  assert.deepEqual(session.snapshot().job?.statementIds,[]);
});
