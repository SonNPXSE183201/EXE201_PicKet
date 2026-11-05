import { paperShape, paperSpace } from "../../core/theme/paper-foundations";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
type Element={type:unknown;props:Record<string,unknown>};
function nodes(value:unknown):Element[]{if(Array.isArray(value))return value.flatMap(nodes);if(!value||typeof value!=="object"||!("props" in value))return [];const n=value as Element;return [n,...nodes(n.props.children)];}
function text(value:unknown):string{if(typeof value==="string")return value;if(Array.isArray(value))return value.map(text).join("");if(value&&typeof value==="object"&&"props" in value)return text((value as Element).props.children);return "";}
function harness(initialFailure=false){
 const slots:unknown[]=[];let cursor=0,completions=0,clears=0,reads=0,readFailure=initialFailure,release!:(value:unknown)=>void,reject!:(error:Error)=>void;const pending=new Promise((done,fail)=>{release=done;reject=fail;});
 let customLoad:(()=>Promise<unknown>)|undefined,customReviews:(()=>Promise<unknown[]>)|undefined,notify:(()=>void)|undefined,onActive:((state:string)=>void)|undefined;
 const state=(initial:unknown)=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],(v:unknown)=>{slots[i]=typeof v==="function"?v(slots[i]):v;}];};
 const ref=(initial:unknown)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});};
 const effect=(fn:()=>unknown,deps:unknown[])=>{const i=cursor++,old=slots[i] as {deps:unknown[];cleanup?:()=>void}|undefined;if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j]))){old?.cleanup?.();slots[i]={deps,cleanup:fn()};}};
 const lesson={lessonId:"lesson",version:1,title:"Lesson",objective:"Objective",body:"Body",workedExample:{description:"Example"},questions:[{prompt:"Q",choices:[{text:"Answer",explanation:"Why"}]}],optionalAction:{text:"Action"},sources:[]};
 const progress={version:1,completed:[]};const adapters:Record<string,unknown>={
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
 react:{useState:state,useRef:ref,useEffect:effect},"react/jsx-runtime":{jsx:(type:unknown,props:unknown)=>({type,props}),jsxs:(type:unknown,props:unknown)=>({type,props})},
 "react-native":{Text:"Text",View:"View",ScrollView:"ScrollView",AppState:{addEventListener:(_event:string,fn:(state:string)=>void)=>{onActive=fn;return {remove:()=>{}};}}},"react-native-safe-area-context":{SafeAreaView:"SafeAreaView"},
 "@/core/ui/accessible-pressable":{AccessiblePressable:"Pressable"},"@/features/settings/appearance-provider":{useAppTheme:()=>({colors:{},language:"en"})},"react-i18next":{useTranslation:()=>({t:(key:string)=>key})},"@/features/auth/auth-context":{useAuth:()=>({session:null,localMode:true})},
 "@/features/learning/curriculum":{curriculumForLanguage:()=>({lessons:[lesson],publicationGate:{publishable:false}}),gradeQuiz:()=>({correct:1,total:1})},
 "@/features/learning/progress-storage":{learningProgress:{subscribe:(_owner:string,callback:()=>void)=>{notify=callback;return ()=>{};},load:async()=>{reads++;if(customLoad)return customLoad();if(readFailure)throw Error("Unavailable");return progress;},dueReviews:async()=>customReviews?customReviews():[],complete:async()=>{completions++;return pending;}},learningDrafts:{load:async()=>null,save:async()=>{},clearIfUnchanged:async()=>{clears++;}}},
 };
 const exports:{Session?:(props:{owner:string})=>unknown}={};vm.runInNewContext(ts.transpileModule(readFileSync("src/app/learning-preview.tsx","utf8")+'\nexports.Session=LearningSession;',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(key:string)=>adapters[key]??{},Date,setInterval:()=>1,clearInterval:()=>{}});
 const render=()=>{cursor=0;return exports.Session!({owner:"guest"});};
 const button=(label:string)=>{const node=nodes(render()).find(n=>n.type==="Pressable"&&text(n.props.children).includes(label));assert.ok(node,label);return node;};
 return {render,button,viewText:()=>text(render()),setLoad:(load:()=>Promise<unknown>)=>{customLoad=load;},notify:()=>notify!(),setReviews:(load:()=>Promise<unknown[]>)=>{customReviews=load;},foreground:()=>onActive!("active"),release:()=>release(progress),failSave:()=>reject(Error("Write unavailable")),setReadFailure:(value:boolean)=>{readFailure=value;},reads:()=>reads,counts:()=>({completions,clears}),stop:()=>{for(const slot of slots)(slot as {cleanup?:()=>void})?.cleanup?.();}};
}
async function settle(){for(let i=0;i<5;i++)await new Promise(done=>setImmediate(done));}
async function ready(){const app=harness();app.render();await settle();(app.button("Lesson").props.onPress as ()=>void)();(app.button("Answer").props.onPress as ()=>void)();(app.button("explanations").props.onPress as ()=>void)();return app;}
test("rapid lesson save callbacks persist completion once",async()=>{const app=await ready();const save=app.button("saveCompletion").props.onPress as ()=>void;save();save();assert.equal(app.counts().completions,1);app.release();await settle();});
test("lesson navigation and retry remain blocked until completion settles",async()=>{const app=await ready();const back=app.button("back").props.onPress as ()=>void,retry=app.button("retry").props.onPress as ()=>void;(app.button("saveCompletion").props.onPress as ()=>void)();back();retry();assert.ok(app.button("saveCompletion"));app.release();await settle();});
test("unmounted lesson completion does not clear a draft after returning",async()=>{const app=await ready();(app.button("saveCompletion").props.onPress as ()=>void)();app.stop();app.release();await settle();assert.equal(app.counts().clears,0);});

test("lesson selection waits for stored draft hydration",async()=>{
 const app=harness();app.render();(app.button("Lesson").props.onPress as ()=>void)();assert.throws(()=>app.button("Answer"));
 await settle();(app.button("Lesson").props.onPress as ()=>void)();assert.ok(app.button("Answer"));
});

test("learning storage can recover without restarting and rapid retries read once",async()=>{const app=harness(true);app.render();await settle();app.setReadFailure(false);const retry=app.button("retryStorage").props.onPress as ()=>void;const before=app.reads();retry();retry();await settle();assert.equal(app.reads(),before+1);(app.button("Lesson").props.onPress as ()=>void)();assert.ok(app.button("Answer"));});

test("storage recovery preserves submitted answers and does not resubmit completion",async()=>{const app=await ready();(app.button("saveCompletion").props.onPress as ()=>void)();app.failSave();await settle();(app.button("retryStorage").props.onPress as ()=>void)();await settle();assert.ok(app.button("saveCompletion"));assert.equal(app.counts().completions,1);assert.equal(app.counts().clears,0);});

test("unavailable storage stays recoverable without clearing drafts or recording completion",async()=>{
 const app=harness(true);app.render();await settle();(app.button("retryStorage").props.onPress as ()=>void)();await settle();assert.ok(app.button("retryStorage"));assert.deepEqual(app.counts(),{completions:0,clears:0});
});

test("late initial progress does not overwrite a newer subscription snapshot",async()=>{const app=harness();let release!:(v:unknown)=>void;const held=new Promise(done=>{release=done;});app.setLoad(()=>held);app.render();app.setLoad(async()=>({version:1,completed:[{}]}));app.notify();await settle();assert.match(app.viewText(),/Review1\/1\. Lesson/);release({version:1,completed:[]});await settle();assert.match(app.viewText(),/Review1\/1\. Lesson/);});

test("superseded review refresh cannot restore an already completed review",async()=>{const app=harness();let release!:(v:unknown[])=>void;const held=new Promise<unknown[]>(done=>{release=done;});app.setReviews(()=>held);app.render();await settle();app.setReviews(async()=>[]);app.foreground();await settle();release([{lessonId:"lesson",version:1,offset:7,dueDay:"2026-10-01"}]);await settle();assert.throws(()=>app.button("reviewOpen"));});

test("a superseded subscription read error does not hide a newer successful progress load",async()=>{
 const app=harness();app.render();await settle();let reject!:(error:Error)=>void;const held=new Promise((_done,fail)=>{reject=fail;});app.setLoad(()=>held);app.notify();app.setLoad(async()=>({version:1,completed:[{}]}));app.notify();await settle();reject(Error("Old read failed"));await settle();assert.match(app.viewText(),/Review1\/1\. Lesson/);assert.throws(()=>app.button("retryStorage"));
});
