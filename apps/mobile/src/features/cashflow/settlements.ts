import type { CashflowOccurrence } from "./forecast";
import { ledgerOpening,type LedgerSnapshot } from "./ledger-snapshot";
export type SettlementLink={occurrenceId:string;day:string;amount:number;currency:string;transactionId:string;transactionUpdatedAt:string};
export function resolveSettlements(snapshot:LedgerSnapshot,accounts:string[],currency:string,occurrences:CashflowOccurrence[],links:SettlementLink[]):string[]{
 if(links.length>1000)throw new Error("Too many settlements");
 const facts=ledgerOpening(snapshot,accounts,currency,0);
 const included=new Set(facts.includedTransactionIds),used=new Set<string>(),settled=new Set<string>();
 const expected=new Map(occurrences.map(row=>[row.id,row]));
 const entries=new Map(snapshot.entries.map(row=>[row.id,row]));
 if(expected.size!==occurrences.length)throw new Error("Duplicate occurrence");
 for(const link of links){
  const occurrence=expected.get(link.occurrenceId),entry=entries.get(link.transactionId);
  if(!occurrence||!entry||!included.has(entry.id)||!accounts.includes(entry.accountId)||entry.kind==="transfer"||
     (occurrence.walletId!==undefined&&occurrence.walletId!==entry.accountId)||
     occurrence.currency!==currency||link.currency!==currency||link.day!==occurrence.day||link.amount!==occurrence.amount||
     entry.updatedAt!==link.transactionUpdatedAt||entry.amount*(entry.kind==="expense"?-1:1)!==occurrence.amount||
     used.has(entry.id)||settled.has(occurrence.id))throw new Error("Settlement evidence changed or does not match");
  used.add(entry.id);settled.add(occurrence.id);
 }
 return [...settled];
}
