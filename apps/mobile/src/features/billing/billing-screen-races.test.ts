import { paperShape, paperSpace } from "../../core/theme/paper-foundations";
import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
type Element={type:unknown;props:Record<string,unknown>};
function nodes(value:unknown):Element[]{if(Array.isArray(value))return value.flatMap(nodes);if(!value||typeof value!=="object"||!("props" in value))return [];const node=value as Element;return [node,...nodes(node.props.children)];}
function text(value:unknown):string{if(typeof value==="string")return value;if(Array.isArray(value))return value.map(text).join("");return value&&typeof value==="object"&&"props" in value?text((value as Element).props.children):"";}
const productIds=["picket_plus_monthly","picket_plus_yearly","picket_pro_monthly","picket_pro_yearly"];
function harness(){
 const slots:unknown[]=[];let cursor=0,reads=0,verified=0,purchaseRequests=0,catalogReads=0,accessToken="test-token";let release!:(value:unknown[])=>void;
 const pending=new Promise<unknown[]>(done=>{release=done;});
 let entitlementRead:()=>Promise<unknown>=async()=>null;
 let displayPrice="test price";
 let productStatusAndroid:string|undefined;
 let catalogueRequest:()=>Promise<void>=async()=>{};
 const fetchProducts=async()=>{catalogReads++;await catalogueRequest();};
 const state=(initial:unknown)=>{const index=cursor++;if(!(index in slots))slots[index]=typeof initial==="function"?initial():initial;return [slots[index],(value:unknown)=>{slots[index]=typeof value==="function"?value(slots[index]):value;}];};
 const ref=(initial:unknown)=>{const index=cursor++;return slots[index]??(slots[index]={current:initial});};
 const effect=(callback:()=>unknown,deps:unknown[])=>{const index=cursor++;const old=slots[index] as {deps:unknown[];cleanup?:()=>void}|undefined;if(!old||deps.some((value,position)=>!Object.is(value,old.deps[position]))){old?.cleanup?.();slots[index]={deps,cleanup:callback()};}};
 const api={billingAvailability:async()=>({newPurchasesEnabled:true}),currentEntitlements:()=>entitlementRead(),verifyPlayPurchase:async()=>{verified++;return {active:true,tier:"plus"};}};
 const adapters:Record<string,unknown>={
  "@expo/vector-icons":{MaterialCommunityIcons:"Icon"},
  "@/features/billing/billing-ui":Object.fromEntries(["BillingSection","CadenceToggle","CurrentPlanHero","IncludedList","PlanTiles","ThankYouCard"].map(name=>[name,name])),
  "@/core/ui/figma-ui":{FigmaButton:"FigmaButton",Skeleton:"Skeleton"},
  "@/core/ui/picket-ui":{PicketScreen:"PicketScreen",TopAppBar:"TopAppBar"},
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
  react:{useState:state,useRef:ref,useEffect:effect},"react/jsx-runtime":{jsx:(type:unknown,props:unknown)=>({type,props}),jsxs:(type:unknown,props:unknown)=>({type,props})},
  "react-native":{ActivityIndicator:"ActivityIndicator",Platform:{OS:"android"},ScrollView:"ScrollView",Text:"Text",View:"View",StyleSheet:{create:(value:unknown)=>value}},"react-native-safe-area-context":{SafeAreaView:"SafeAreaView"},
  "@/core/theme/use-mobile-styles":{useMobileStyles:()=>({colors:{},styles:{}})},"@/core/ui/mobile-palette":{radii:{}},"@/core/ui/accessible-pressable":{AccessiblePressable:"Pressable"},"react-i18next":{useTranslation:()=>({t:(key:string,params?:{tier?:string})=>key==="current"?`current:${params?.tier}`:key})},
  "@picket/domain":{PICKET_SUBSCRIPTION_IDS:productIds},"@/core/api/client":{picketApi:api},"@/core/navigation/routes":{routes:{}},
  "expo-crypto":{CryptoDigestAlgorithm:{SHA256:"SHA256"},digestStringAsync:async()=>"synthetic-account-hash"},
  "@/features/billing/play-billing-provider":{usePlayBilling:()=>({connected:true,subscriptions:productIds.map(id=>({id,platform:"android",productStatusAndroid,subscriptionOffers:[{offerTokenAndroid:"synthetic-offer",displayPrice}]})),fetchProducts,finishTransaction:async()=>{},requestPurchase:async()=>{purchaseRequests++;},revision:0})},
  "expo-iap":{getAvailablePurchases:()=>{reads++;return pending;},deepLinkToSubscriptions:async()=>{}},
  "@/features/billing/billing-policy":{canStartPlayPurchase:()=>true,isPicketSubscriptionId:()=>true,verifyAndFinishPurchase:async(purchase:unknown,verify:(p:unknown)=>unknown)=>verify(purchase)},
  "@/features/billing/restore-results":{verifyRestoredPurchases:async(purchases:unknown[],verify:(p:unknown)=>Promise<boolean>)=>{let count=0;for(const purchase of purchases)if(await verify(purchase))count++;return {verified:count,failed:purchases.length-count};}},
 };
 const exports:{Content?:(props:{accessToken:string;userId:string})=>unknown}={};
 vm.runInNewContext(ts.transpileModule(readFileSync("src/features/billing/play-billing-screen.tsx","utf8")+'\nexports.Content=BillingContent;',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:(key:string)=>adapters[key]??{},AbortController});
 const render=()=>{cursor=0;return exports.Content!({accessToken,userId:"test-owner"});};
 const control=(key:string)=>nodes(render()).find(node=>node.props.label===key);
 const restore=()=>{const button=control("restore");assert.ok(button);return button.props.onPress as ()=>void;};
 const buy=()=>{const button=control("upgrade");assert.ok(button);return button.props.onPress as ()=>void;};
 const reloadPrices=()=>{const button=control("reloadPrices");assert.ok(button);(button.props.onPress as ()=>void)();render();};
 return {render,selectYearly:()=>{const toggle=nodes(render()).find(node=>node.type==="CadenceToggle");assert.ok(toggle);(toggle.props.onChange as (value:string)=>void)("yearly");},restore,buy,reloadPrices,setProductStatus:(value:string)=>{productStatusAndroid=value;},setCatalogueRequest:(request:()=>Promise<void>)=>{catalogueRequest=request;},catalogReads:()=>catalogReads,setPrice:(value:string)=>{displayPrice=value;},buyDisabled:()=>control("upgrade")?.props.disabled,viewText:()=>JSON.stringify(render()),setEntitlementRead:(read:()=>Promise<unknown>)=>{entitlementRead=read;},purchases:()=>purchaseRequests,refreshToken:()=>{accessToken="new-test-token";render();},reads:()=>reads,verified:()=>verified,release:()=>release([{productId:"picket_plus_monthly",purchaseToken:"synthetic-token"}]),stop:()=>{for(const slot of slots)(slot as {cleanup?:()=>void})?.cleanup?.();}};
}
async function settle(){for(let index=0;index<5;index++)await new Promise(done=>setImmediate(done));}
test("rapid restore taps query Google Play only once",async()=>{const app=harness();const press=app.restore();press();press();assert.equal(app.reads(),1);app.release();await settle();});
test("restoring stops before verification after the billing screen unmounts",async()=>{const app=harness();app.restore()();app.stop();app.release();await settle();assert.equal(app.verified(),0);});
test("a replaced access token retires an unfinished Play restore",async()=>{const app=harness();app.restore()();app.refreshToken();app.release();await settle();assert.equal(app.verified(),0);});
test("rapid purchase taps open one Play request",async()=>{const app=harness();app.buy();await settle();const press=app.buy();press();press();await settle();assert.equal(app.purchases(),1);});
test("leaving the screen while preparing a purchase prevents Play dispatch",async()=>{const app=harness();app.buy();await settle();app.buy()();app.stop();await settle();assert.equal(app.purchases(),0);});
test("an older entitlement read cannot overwrite a newer restored plan",async()=>{
 const app=harness();let release!:(value:unknown)=>void;const held=new Promise(done=>{release=done;});app.setEntitlementRead(()=>held);app.restore()();app.setEntitlementRead(async()=>({tier:"pro",ocrFallbackRemaining:10,ocrFallbackDailyLimit:10}));app.release();await settle();assert.ok(app.viewText().includes("current:PRO"));release({tier:"free",ocrFallbackRemaining:1,ocrFallbackDailyLimit:1});await settle();assert.ok(app.viewText().includes("current:PRO"));
});
test("an older entitlement read failure cannot hide a newer restored plan",async()=>{
 const app=harness();let reject!:(error:Error)=>void;const held=new Promise((_done,fail)=>{reject=fail;});app.setEntitlementRead(()=>held);app.restore()();app.setEntitlementRead(async()=>({tier:"plus",ocrFallbackRemaining:10,ocrFallbackDailyLimit:10}));app.release();await settle();assert.ok(app.viewText().includes("current:PLUS"));reject(Error("Old read failed"));await settle();assert.ok(app.viewText().includes("current:PLUS"));
});
test("a failed plan refresh after verification reports refresh failure",async()=>{
 const app=harness();app.restore()();app.setEntitlementRead(async()=>{throw Error("Offline");});app.release();await settle();assert.equal(app.verified(),1);assert.ok(app.viewText().includes("refreshError"));assert.ok(!app.viewText().includes("restoreFailed"));
});
test("a plan with no visible Play offer price cannot dispatch a purchase",async()=>{
 const app=harness();app.setPrice(" ");app.buy();await settle();assert.equal(app.buyDisabled(),true);app.buy()();await settle();assert.equal(app.purchases(),0);
});
test("the Play price catalogue can be reloaded without leaving billing",async()=>{const app=harness();app.buy();await settle();assert.equal(app.catalogReads(),1);app.reloadPrices();await settle();assert.equal(app.catalogReads(),2);});
test("a rejected catalogue load remains retryable",async()=>{const app=harness();app.setCatalogueRequest(async()=>{throw Error("Store unavailable");});app.buy();await settle();assert.ok(app.viewText().includes("connectionError"));app.setCatalogueRequest(async()=>{});app.reloadPrices();await settle();assert.equal(app.catalogReads(),2);assert.ok(!app.viewText().includes("connectionError"));});

for(const status of ["not-found","no-offers-available","unknown"])test(`unfetched Play product ${status} shows retry instead of an inert purchase card`,async()=>{
 const app=harness();app.setProductStatus(status);app.viewText();await settle();assert.ok(app.viewText().includes("pricesUnavailable"));assert.ok(!app.viewText().includes('"label":"upgrade"'));app.reloadPrices();await settle();assert.equal(app.catalogReads(),2);assert.equal(app.purchases(),0);
});


test("billing compares Plus and Pro in the selected billing period with one upgrade action",async()=>{
 const app=harness();app.render();await settle();
 const tileIds=()=>((nodes(app.render()).find(n=>n.type==="PlanTiles")?.props.plans??[]) as {id:string}[]).map(plan=>plan.id);
 assert.deepEqual(tileIds(),["picket_plus_monthly","picket_pro_monthly"]);
 app.selectYearly();
 assert.deepEqual(tileIds(),["picket_plus_yearly","picket_pro_yearly"]);
 assert.equal(nodes(app.render()).filter(n=>n.props.label==="upgrade").length,1);
 app.stop();
});

test("exhausted cloud quota keeps on-device scan guidance visible",async()=>{
 const app=harness();app.setEntitlementRead(async()=>({tier:"pro",ocrFallbackRemaining:0,ocrFallbackDailyLimit:100}));app.render();await settle();
 assert.ok(app.viewText().includes("exhausted"));assert.ok(app.viewText().includes("localIncluded"));app.stop();
});
