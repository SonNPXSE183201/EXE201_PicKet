import { buildLedgerFacts,type LedgerFactsInput } from "./ledger-facts";
export type LedgerSnapshot=Pick<LedgerFactsInput,"asOf"|"entries"|"confirmations">&{wallets:(LedgerFactsInput["wallets"][number]&{name:string})[]};
function record(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Invalid ledger record");
  return value as Record<string,unknown>;
}
function text(value:unknown):string{if(typeof value!=="string"||!value||value.length>1000)throw new Error("Invalid ledger text");return value;}
function instant(value:unknown):string{
 const raw=text(value);
 if(!/^\d{4}-\d{2}-\d{2}T/.test(raw)||!/(Z|[+-]\d{2}:\d{2})$/.test(raw)||!Number.isFinite(Date.parse(raw)))throw new Error("Invalid ledger timestamp");
 return raw;
}
function nullableDate(value:unknown){return value===null?null:instant(value);}
function amount(value:unknown){if(typeof value!=="number"||!Number.isSafeInteger(value)||Math.abs(value)>9e12)throw new Error("Invalid ledger amount");return value;}
export function parseLedgerSnapshot(value:unknown):LedgerSnapshot{
 const raw=record(value),asOf=instant(raw.asOf);
 if(!Array.isArray(raw.wallets)||raw.wallets.length>1000||!Array.isArray(raw.entries)||raw.entries.length>100000||!Array.isArray(raw.confirmations)||raw.confirmations.length>100000)throw new Error("Invalid ledger snapshot size");
 const wallets=raw.wallets.map(value=>{
  const row=record(value);
  if(typeof row.archived!=="boolean"||typeof row.currencyCode!=="string"||!/^[A-Z]{3}$/.test(row.currencyCode))throw new Error("Invalid wallet");
  return {id:text(row.id),name:text(row.name),currencyCode:row.currencyCode,openingBalance:amount(row.openingBalance),archived:row.archived,deletedAt:nullableDate(row.deletedAt),updatedAt:instant(row.updatedAt)};
 });
 const entries=raw.entries.map(value=>{
  const row=record(value);
  if(!["expense","income","refund","transfer"].includes(String(row.kind))||amount(row.amount)<=0)throw new Error("Invalid ledger movement");
  return {id:text(row.id),accountId:text(row.accountId),destinationAccountId:row.destinationAccountId===null?null:text(row.destinationAccountId),kind:row.kind as string,amount:amount(row.amount),occurredAt:instant(row.occurredAt),updatedAt:instant(row.updatedAt),deletedAt:nullableDate(row.deletedAt)};
 });
 const confirmations=raw.confirmations.map(value=>{
  const row=record(value);
  if(row.source!=="cloud-verified"||row.confirmedAt!==asOf)throw new Error("Unverified ledger origin");
  return {transactionId:text(row.transactionId),source:"cloud-verified" as const,confirmedAt:instant(row.confirmedAt)};
 });
 for(const rows of [wallets,entries])if(new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error("Duplicate ledger identity");
 if(new Set(confirmations.map(row=>row.transactionId)).size!==confirmations.length)throw new Error("Duplicate confirmation");
 return {asOf,wallets,entries,confirmations};
}
export function ledgerOpening(snapshot:LedgerSnapshot,ids:string[],currency:string,pendingCount:number):ReturnType<typeof buildLedgerFacts>{
  if(!Number.isSafeInteger(pendingCount)||pendingCount!==0)throw new Error("Pending changes must sync first");
  const facts=buildLedgerFacts({...snapshot,currency,selectedAccountIds:ids,pendingTransactionIds:[]});
  if(facts.quality!=="ready")throw new Error("Ledger facts are incomplete");
  return facts;
}
