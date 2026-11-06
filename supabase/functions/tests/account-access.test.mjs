import assert from 'node:assert/strict';
import test from 'node:test';
import{readFileSync}from'node:fs';
import{createRequire}from'node:module';
import vm from'node:vm';
const ts=createRequire(new URL('../../../apps/mobile/package.json',import.meta.url))('typescript');
function harness(policy,error=null){
 const exports={};const calls=[];
 const createClient=(url,key,options)=>options.global?{rpc:async name=>{calls.push({name,bearer:options.global.headers.Authorization,key});return{data:policy,error};}}:{auth:{getUser:async()=>({data:{user:{id:'fixture-owner'}},error:null})}};
 const js=ts.transpileModule(readFileSync(new URL('../_shared/auth.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{exports,require:()=>({createClient}),Deno:{env:{get:n=>n==='SUPABASE_ANON_KEY'?'public-fixture':n==='SUPABASE_URL'?'https://project.supabase.co':'service-fixture'}},Response,crypto:globalThis.crypto,TextEncoder});
 return{calls,run:()=>exports.requireUser(new Request('https://fixture.test',{headers:{authorization:'Bearer fixture-token'}}))};
}
test('consumer Edge operations reject staff and revoked sessions',async()=>{
 for(const policy of [{staff:true,mobileAllowed:false},null,{staff:false,mobileAllowed:false}])await assert.rejects(harness(policy).run(),/Unauthorized/);
 await assert.rejects(harness({staff:false,mobileAllowed:true},{code:'42501'}).run(),/Unauthorized/);
});
test('consumer Edge authorization uses caller-scoped fresh policy',async()=>{
 const h=harness({staff:false,mobileAllowed:true});assert.equal((await h.run()).id,'fixture-owner');
 assert.deepEqual(h.calls,[{name:'account_access',bearer:'Bearer fixture-token',key:'public-fixture'}]);
});
