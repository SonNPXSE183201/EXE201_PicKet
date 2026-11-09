import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as domain from '@picket/domain';

const phoneCalls:unknown[]=[];
function provider(signInWithPassword:(credentials:domain.PasswordLoginCredentials)=>Promise<{error:Error|null}>){
 const adapters:Record<string,unknown>={
  '@picket/domain':domain,
  react:{createContext:()=>({Provider:'Provider'}),useCallback:(fn:unknown)=>fn,useMemo:(fn:()=>unknown)=>fn(),useEffect:()=>undefined,useRef:(value:unknown)=>({current:value}),useState:(initial:unknown)=>[initial,()=>undefined]},
  'react/jsx-runtime':{jsx:(type:unknown,props:unknown)=>({type,props})},
  'expo-linking':{createURL:()=> 'com.picket.mobile://auth/callback'},
  'expo-web-browser':{maybeCompleteAuthSession:()=>undefined},
  'expo-secure-store':{},'react-native':{Platform:{OS:'android'},AppState:{currentState:'active',addEventListener:()=>({remove(){}})}},
  '@/core/supabase/client':{supabase:{auth:{signInWithPassword,setSession:async(tokens:unknown)=>{phoneCalls.push({setSession:tokens});return {error:null};}}},authStorageKey:'fixture'},
  '@/core/api/client':{picketApi:{phoneLogin:async(phone:string,password:string)=>{phoneCalls.push({phone,password});return {access_token:'a',refresh_token:'r'};}}},
  '@/features/auth/phone-sign-in':{phoneSignInTokens:async(api:{phoneLogin:(p:string,w:string)=>Promise<{access_token:string;refresh_token:string}>},phone:string,password:string)=>{const s=await api.phoneLogin(phone,password);return {access_token:s.access_token,refresh_token:s.refresh_token};}},
  '@/core/storage/secure-auth-storage':{},'@/features/auth/auth-callback':{},'@/features/auth/session-recovery':{},
  '@/features/auth/device-sign-out':{createAuthMutationQueue:()=> (action:()=>unknown)=>action()},
 };
 const exports={} as {AuthProvider:(props:unknown)=>{props:{value:{signIn:(identifier:string,password:string)=>Promise<void>}}}};
 const compiled=ts.transpileModule(readFileSync('src/features/auth/auth-context.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(compiled,{exports,require:(key:string)=>{assert.ok(key in adapters,`Unexpected dependency ${key}`);return adapters[key];}});
 return exports.AuthProvider({children:null}).props.value;
}

test('email sign-in uses password Auth; phone sign-in goes through the API session and no signup',async()=>{
 const calls:domain.PasswordLoginCredentials[]=[];
 phoneCalls.length=0;
 const auth=provider(async input=>{calls.push(input);return {error:null};});
 await auth.signIn('  Existing@Gmail.com  ',' unchanged ');
 await auth.signIn('0901 234 567','other');
 assert.deepEqual(calls,[{email:'existing@gmail.com',password:' unchanged '}]);
 assert.deepEqual(phoneCalls,[{phone:'+84901234567',password:'other'},{setSession:{access_token:'a',refresh_token:'r'}}]);
});
test('invalid identity never contacts Auth and upstream login error is preserved',async()=>{
 let requests=0;const denied=new Error('fixture invalid credentials');
 const auth=provider(async()=>{requests++;return {error:denied};});
 await assert.rejects(()=>auth.signIn('bad identity','password'));
 assert.equal(requests,0);
 await assert.rejects(()=>auth.signIn('known@example.test','wrong'),error=>error===denied);
 assert.equal(requests,1);
});
