import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as domain from '@picket/domain';

function provider(signInWithPassword:(credentials:domain.PasswordLoginCredentials)=>Promise<{error:Error|null}>){
 const adapters:Record<string,unknown>={
  '@picket/domain':domain,
  react:{createContext:()=>({Provider:'Provider'}),useCallback:(fn:unknown)=>fn,useMemo:(fn:()=>unknown)=>fn(),useEffect:()=>undefined,useState:(initial:unknown)=>[initial,()=>undefined]},
  'react/jsx-runtime':{jsx:(type:unknown,props:unknown)=>({type,props})},
  'expo-linking':{createURL:()=> 'com.picket.mobile://auth/callback'},
  'expo-web-browser':{maybeCompleteAuthSession:()=>undefined},
  'expo-secure-store':{},'react-native':{Platform:{OS:'android'}},
  '@/core/supabase/client':{supabase:{auth:{signInWithPassword}},authStorageKey:'fixture'},
  '@/core/storage/secure-auth-storage':{},'@/features/auth/auth-callback':{},'@/features/auth/session-recovery':{},
  '@/features/auth/device-sign-out':{createAuthMutationQueue:()=> (action:()=>unknown)=>action()},
 };
 const exports={} as {AuthProvider:(props:unknown)=>{props:{value:{signIn:(identifier:string,password:string)=>Promise<void>}}}};
 const compiled=ts.transpileModule(readFileSync('src/features/auth/auth-context.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(compiled,{exports,require:(key:string)=>{assert.ok(key in adapters,`Unexpected dependency ${key}`);return adapters[key];}});
 return exports.AuthProvider({children:null}).props.value;
}

test('existing account sign-in calls password Auth with email or phone and no signup',async()=>{
 const calls:domain.PasswordLoginCredentials[]=[];
 const auth=provider(async input=>{calls.push(input);return {error:null};});
 await auth.signIn('  Existing@Gmail.com  ',' unchanged ');
 await auth.signIn('0901 234 567','other');
 assert.deepEqual(calls,[{email:'existing@gmail.com',password:' unchanged '},{phone:'+84901234567',password:'other'}]);
});
test('invalid identity never contacts Auth and upstream login error is preserved',async()=>{
 let requests=0;const denied=new Error('fixture invalid credentials');
 const auth=provider(async()=>{requests++;return {error:denied};});
 await assert.rejects(()=>auth.signIn('bad identity','password'));
 assert.equal(requests,0);
 await assert.rejects(()=>auth.signIn('known@example.test','wrong'),error=>error===denied);
 assert.equal(requests,1);
});
