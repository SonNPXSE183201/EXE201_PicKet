type Wallet={id:string;currencyCode:string;openingBalance:number;archived:boolean;deletedAt:string|null;updatedAt:string};
type Entry={id:string;accountId:string;destinationAccountId:string|null;kind:string;amount:number;occurredAt:string;deletedAt:string|null;updatedAt:string};
type Confirmation={transactionId:string;confirmedAt:string;source:"manual"|"reviewed-receipt"|"cloud-verified"};
export type LedgerFactsInput={asOf:string;currency:string;selectedAccountIds:string[];wallets:Wallet[];entries:Entry[];confirmations:Confirmation[];pendingTransactionIds:string[]};
function instant(value:string){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(value)||!/(Z|[+-]\d{2}:\d{2})$/.test(value))throw new Error("Invalid fact timestamp");
  const time=Date.parse(value),calendar=Date.parse(`${value.slice(0,10)}T00:00:00Z`);
  if(!Number.isFinite(time)||!Number.isFinite(calendar)||new Date(calendar).toISOString().slice(0,10)!==value.slice(0,10))throw new Error("Invalid fact timestamp");
  return time;
}
function money(value:number){
  if(!Number.isSafeInteger(value)||Math.abs(value)>9e12)throw new Error("Invalid ledger fact amount");
  return value;
}
/** Facts for supplied confirmed records, not a claim of complete real finances.
 * No receipt/split amounts are accepted as independent ledger movements. */
export function buildLedgerFacts(input:LedgerFactsInput){
  const asOf=instant(input.asOf);
  const scope=new Set(input.selectedAccountIds);
  if(!/^[A-Z]{3}$/.test(input.currency)||scope.size===0||scope.size!==input.selectedAccountIds.length||scope.size>1000||input.entries.length>100000)throw new Error("Invalid ledger scope");
  const wallets=new Map<string,Wallet>();
  for(const wallet of input.wallets){
    if(!wallet.id||wallets.has(wallet.id)||!/^[A-Z]{3}$/.test(wallet.currencyCode))throw new Error("Invalid ledger wallet");
    wallets.set(wallet.id,wallet);
  }
  const excluded:{id:string;reason:string}[]=[];
  let balance=0;
  for(const id of scope){
    const wallet=wallets.get(id);
    if(!wallet||wallet.currencyCode!==input.currency||wallet.archived)throw new Error("Selected wallet is unavailable or uses another currency");
    money(wallet.openingBalance);
    if(instant(wallet.updatedAt)>asOf||(wallet.deletedAt&&instant(wallet.deletedAt)>asOf))excluded.push({id:`wallet:${id}`,reason:"edited-after-origin"});
    else if(wallet.deletedAt)throw new Error("Selected wallet is deleted");
    else balance=money(balance+wallet.openingBalance);
  }
  const confirmations=new Map<string,Confirmation>();
  for(const confirmation of input.confirmations){
    instant(confirmation.confirmedAt);
    if(!confirmation.transactionId||confirmations.has(confirmation.transactionId)||!["manual","reviewed-receipt","cloud-verified"].includes(confirmation.source))throw new Error("Invalid ledger confirmation");
    confirmations.set(confirmation.transactionId,confirmation);
  }
  const pending=new Set(input.pendingTransactionIds);
  const seen=new Set<string>(),includedTransactionIds:string[]=[];
  const provenance:{transactionId:string;source:Confirmation["source"];confirmedAt:string}[]=[];
  for(const row of input.entries){
    if(!row.id||seen.has(row.id)||money(row.amount)<=0||!["income","expense","refund","transfer"].includes(row.kind))throw new Error("Invalid ledger entry");
    seen.add(row.id);
    const occurred=instant(row.occurredAt),updated=instant(row.updatedAt);
    const deleted=row.deletedAt?instant(row.deletedAt):null;
    if(deleted!==null&&deleted<=asOf)continue;
    if(occurred>asOf)continue;
    const source=wallets.get(row.accountId),destination=row.destinationAccountId?wallets.get(row.destinationAccountId):undefined;
    if(row.kind==="transfer"&&row.accountId===row.destinationAccountId)throw new Error("Transfer wallets must differ");
    if(!source||(row.kind==="transfer"&&!destination)){
      excluded.push({id:row.id,reason:"unknown-wallet"});continue;
    }
    const from=scope.has(row.accountId),to=row.destinationAccountId!==null&&scope.has(row.destinationAccountId);
    if(!from&&!to)continue;
    if(row.kind==="transfer"&&source.currencyCode!==destination?.currencyCode)throw new Error("Cross-currency transfer requires conversion facts");
    if(row.kind!=="transfer"&&row.destinationAccountId!==null)throw new Error("Only transfers have a destination wallet");
    const confirmation=confirmations.get(row.id);
    const reason=updated>asOf||(deleted!==null&&deleted>asOf)?"edited-after-origin":pending.has(row.id)?"pending":!confirmation||instant(confirmation.confirmedAt)>asOf?"unconfirmed":null;
    if(reason){excluded.push({id:row.id,reason});continue;}
    if(from)balance=money(balance+((row.kind==="expense"||row.kind==="transfer")?-row.amount:row.amount));
    if(row.kind==="transfer"&&to)balance=money(balance+row.amount);
    includedTransactionIds.push(row.id);
    provenance.push({transactionId:row.id,source:confirmation!.source,confirmedAt:confirmation!.confirmedAt});
  }
  return {quality:excluded.length?"incomplete":"ready",balance,currency:input.currency,asOf:input.asOf,
    selectedAccountIds:[...scope],includedTransactionIds,excluded,provenance,
    limitations:["Only supplied confirmed records are included; missing records remain unknown.","Historical versions cannot be reconstructed from records edited after the origin."]};
}
