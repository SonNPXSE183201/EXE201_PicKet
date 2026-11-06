import { ledgerOpening,type LedgerSnapshot } from "./ledger-snapshot";
export function buildWeeklyStory(snapshot:LedgerSnapshot,accounts:string[],currency:string):{weekStart:string;throughDay:string;income:number;expenses:number;refunds:number;transferNet:number;net:number;transactionIds:string[]}{
 const facts=ledgerOpening(snapshot,accounts,currency,0),included=new Set(facts.includedTransactionIds);
 const end=new Date(snapshot.asOf),throughDay=end.toISOString().slice(0,10);
 const monday=new Date(throughDay+"T00:00:00Z");monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
 const weekStart=monday.toISOString().slice(0,10);
 let income=0,expenses=0,refunds=0,transferNet=0;
 const transactionIds:string[]=[];
 const money=(value:number)=>{if(!Number.isSafeInteger(value)||Math.abs(value)>9e12)throw new Error("Weekly total overflow");return value;};
 for(const entry of snapshot.entries){
  if(!included.has(entry.id)||Date.parse(entry.occurredAt)<monday.getTime())continue;
  transactionIds.push(entry.id);
  if(entry.kind==="income")income=money(income+entry.amount);
  if(entry.kind==="expense")expenses=money(expenses+entry.amount);
  if(entry.kind==="refund")refunds=money(refunds+entry.amount);
  if(entry.kind==="transfer")transferNet=money(transferNet+(accounts.includes(entry.accountId)?-entry.amount:0)+(entry.destinationAccountId&&accounts.includes(entry.destinationAccountId)?entry.amount:0));
 }
 return {weekStart,throughDay,income,expenses,refunds,transferNet,net:money(income-expenses+refunds+transferNet),transactionIds};
}
