import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function held<T>(){let resolve!:(v:T)=>void;const promise=new Promise<T>(done=>{resolve=done;});return {promise,resolve};}
function harness(){
 const source=readFileSync(new URL("./reminder-coordinator.tsx",import.meta.url),"utf8");
 const begin=source.indexOf('  useEffect(() => {'),end=source.indexOf('  }, [session]);',begin);
 const code=source.slice(begin,end)+'  }, [session]);';
 const requests:ReturnType<typeof held<{keepsakes:unknown[]}>>[]=[],rows:unknown[][]=[];let changed!:(owner:string)=>void,cleanup!:()=>void;
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{
  session:{user:{id:"A"},access_token:"synthetic"},useEffect:(fn:()=>()=>void)=>{cleanup=fn();},listKeepsakes:async()=>[],
  picketApi:{listKeepsakes:()=>{const request=held<{keepsakes:unknown[]}>();requests.push(request);return request.promise;}},
  onKeepsakesChanged:(fn:(owner:string)=>void)=>{changed=fn;return ()=>{};},onCloudKeepsakesChanged:()=>()=>{},setKeepsakes:(value:{items:unknown[]})=>{rows.push(value.items);},
 });
 return {requests,rows,changed:(owner="A")=>changed(owner),stop:()=>cleanup()};
}
async function settle(){for(let i=0;i<5;i++)await new Promise(done=>setImmediate(done));}
test("older keepsake response cannot restore a reminder after a newer deletion refresh",async()=>{
 const app=harness();app.changed();assert.equal(app.requests.length,2);
 app.requests[1].resolve({keepsakes:[]});await settle();
 app.requests[0].resolve({keepsakes:[{id:"deleted",title:"Old item",purchasedAt:"2026-10-01"}]});await settle();
 assert.equal(app.rows.length,1);assert.equal(app.rows[0].length,0);
});
test("retired coordinator ignores late results and another owner's event",async()=>{
 const app=harness();app.changed("B");assert.equal(app.requests.length,1);app.stop();app.requests[0].resolve({keepsakes:[]});await settle();assert.equal(app.rows.length,0);
});
