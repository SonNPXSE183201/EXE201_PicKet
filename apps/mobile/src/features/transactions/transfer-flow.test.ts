import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {runInNewContext} from "node:vm";
import ts from "typescript";
type Element={type:string;props:Record<string,any>};
function nodes(tree:any):Element[]{return Array.isArray(tree)?tree.flatMap(nodes):tree?.props?[tree,...nodes(tree.props.children)]:[];}
function harness(){
 const state:any[]=[];let cursor=0;const calls:any[]=[];
 const jsx=(type:string,props:any)=>({type,props});
 const accounts=[{id:"a",name:"Cash",currencyCode:"VND"},{id:"b",name:"Bank",currencyCode:"VND"},{id:"c",name:"USD",currencyCode:"USD"}];
 const react={useRef:(initial:any)=>{const i=cursor++;if(!(i in state))state[i]={current:initial};return state[i];},useState:(initial:any)=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],(value:any)=>{state[i]=value;}];},useMemo:(fn:any)=>fn()};
 const adapters:Record<string,any>={
  "react":react,"react/jsx-runtime":{jsx,jsxs:jsx},
  "react-native":{StyleSheet:{create:(s:any)=>s},View:"View"},
  "expo-router":{useLocalSearchParams:()=>({}),router:{replace:()=>{}},Redirect:"Redirect"},
  "@/core/theme/use-mobile-styles":{useMobileStyles:(fn:any)=>({colors:{},styles:fn({})})},
  "@/features/accounts/accounts-context":{useAccounts:()=>({accounts})},
  "@/features/auth/auth-context":{useAuth:()=>({localMode:true})},
  "@/features/transactions/transactions-context":{useTransactions:()=>({createTransfer:async(input:any)=>calls.push(input)})},
  "@/features/transactions/use-transaction-copy":{useTransactionCopy:()=>({tx:(s:string)=>s})},
  "@/core/navigation/routes":{routes:{transactions:"/transactions"}},
  "@/core/sync/offline-queued-error":{isOfflineQueuedError:()=>false},
  "@/core/theme/paper-foundations":{paperControl:{height:48},paperShape:{}},
  "@/core/ui/picket-text":{PicketText:"Text"},"@/core/ui/picket-text-input":{PicketTextInput:"Input"},
  "@/core/ui/app-icon":{AppIcon:"Icon"},"@/core/ui/accessible-pressable":{AccessiblePressable:"Pressable"},
  "@/core/ui/picket-ui":Object.fromEntries(["TopAppBar","ChoiceChip","FieldLabel","PicketScreen","PrimaryAction","Surface"].map(s=>[s,s])),
 };
 const exports:{default?:()=>Element}={};
 runInNewContext(ts.transpileModule(readFileSync(new URL("../../app/transactions/transfer.tsx",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:(id:string)=>{assert.ok(id in adapters,id);return adapters[id];},Date,Number});
 return {render:()=>{cursor=0;return nodes(exports.default!());},calls};
}
test("transfer needs only amount, filters currency and swaps direction without typing",async()=>{
 const app=harness();let tree=app.render();
 assert.equal(tree.filter(n=>n.type==="Input").length,1);
 assert.equal(tree.find(n=>n.type==="ChoiceChip"&&n.props.label==="USD")!.props.checked,false);
 tree.find(n=>n.type==="Input")!.props.onChangeText("50000");
 tree=app.render();tree.find(n=>n.props.accessibilityLabel==="Đổi chiều chuyển")!.props.onPress();
 tree=app.render();const submit=tree.find(n=>n.type==="PrimaryAction")!.props.onPress; await Promise.all([submit(),submit()]);
 assert.equal(app.calls.length,1);assert.equal(app.calls[0].sourceAccountId,"b");assert.equal(app.calls[0].destinationAccountId,"a");assert.equal(app.calls[0].amount,50000);assert.equal(app.calls[0].title,"Chuyển tiền");
});
