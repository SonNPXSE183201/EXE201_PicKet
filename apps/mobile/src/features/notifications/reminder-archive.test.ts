import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {budgetWarnings} from "./budget-warnings";
const source=readFileSync(new URL("./reminders.ts",import.meta.url),"utf8");
const code=source.slice(source.indexOf("function reminderDate("),source.indexOf("export async function cancelUserReminders"));
function collect(input:unknown):{id:string}[]{
 const exports:{collectReminders?:(input:unknown)=>{id:string}[]}={};
 vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,Date,budgetWarnings,reminderLabel:()=>"Reminder"});
 return exports.collectReminders!(input);
}
test("deleted bills recurring expenses and budgets never produce reminders",()=>{
 const due=new Date(Date.now()+3*86400000).toISOString(),deletedAt=new Date().toISOString();
 const bill={id:"bill",title:"Bill",dueAt:due,status:"pending",paidTransactionId:null};
 const plan={id:"sub",title:"Sub",nextDueAt:due,active:true,alertDays:1};
 const budget={id:"budget",name:"Food",categoryId:"food",defaultLimit:100,alertPercent:80,active:true};
 const localMonth=String(new Date().getFullYear())+"-"+String(new Date().getMonth()+1).padStart(2,"0");
 const transaction={id:"expense",categoryId:"food",amount:100,kind:"expense",occurredAt:`${localMonth}-01T12:00:00Z`};
 const input={bills:[bill],subscriptions:[plan],budgets:[budget],transactions:[transaction],keepsakes:[]};
 assert.equal(collect(input).length,3);
 assert.equal(collect({...input,bills:[{...bill,deletedAt}],subscriptions:[{...plan,deletedAt}],budgets:[{...budget,deletedAt}]}).length,0);
});
