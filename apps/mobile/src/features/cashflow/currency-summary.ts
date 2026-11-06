type Wallet = {id:string;currencyCode:string;openingBalance:number;archived:boolean;deletedAt:string|null};
type Entry = {id:string;accountId:string;destinationAccountId:string|null;kind:string;amount:number;occurredAt:string;deletedAt:string|null};
type CurrencyTotal = {currency:string;balance:number;income:number;expense:number};
function money(value:number) {
  if(!Number.isSafeInteger(value)||Math.abs(value)>9e12)throw new Error("Invalid currency total");
  return value;
}
export function transactionMonthAt(value:string,timeZone:string) {
  if(!Number.isFinite(Date.parse(value)))throw new Error("Invalid transaction instant");
  const parts=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit"}).formatToParts(new Date(value));
  return `${parts.find(p=>p.type==="year")?.value}-${parts.find(p=>p.type==="month")?.value}`;
}
/** Never adds different currencies or treats a wallet transfer as income. */
export function summarizeCurrencies(wallets:Wallet[],entries:Entry[],month:string,timeZone:string) {
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error("Invalid summary month");
  // Validate timezone even when there are no transactions.
  new Intl.DateTimeFormat("en-US",{timeZone});
  const accounts=new Map<string,Wallet>(),totals=new Map<string,CurrencyTotal>();
  const walletBalances:Record<string,number>=Object.create(null);
  const unscopedTransactionIds:string[]=[];
  for(const row of wallets) {
    if(row.deletedAt||row.archived)continue;
    if(accounts.has(row.id)||!/^[A-Z]{3}$/.test(row.currencyCode))throw new Error("Invalid wallet scope");
    accounts.set(row.id,row);walletBalances[row.id]=money(row.openingBalance);
    if(!totals.has(row.currencyCode))totals.set(row.currencyCode,{currency:row.currencyCode,balance:0,income:0,expense:0});
  }
  const ids=new Set<string>();
  for(const row of entries) {
    if(row.deletedAt)continue;
    if(ids.has(row.id)||!Number.isFinite(Date.parse(row.occurredAt))||money(row.amount)<=0||!["income","expense","refund","transfer"].includes(row.kind))throw new Error("Invalid financial entry");
    ids.add(row.id);
    const source=accounts.get(row.accountId),destination=row.destinationAccountId ? accounts.get(row.destinationAccountId) : undefined;
    if(row.kind==="transfer"&&source&&destination&&source.currencyCode!==destination.currencyCode)throw new Error("Cross-currency transfer needs explicit conversion data");
    if(source) {
      walletBalances[source.id]=money(walletBalances[source.id]+(row.kind==="expense"||row.kind==="transfer" ? -row.amount : row.amount));
      const entryMonth=transactionMonthAt(row.occurredAt,timeZone);
      if(entryMonth===month) {
        const total=totals.get(source.currencyCode)!;
        if(row.kind==="income")total.income=money(total.income+row.amount);
        if(row.kind==="expense"||row.kind==="refund")total.expense=money(total.expense+(row.kind==="expense"?row.amount:-row.amount));
      }
    } else if(row.kind!=="transfer") unscopedTransactionIds.push(row.id);
    if(row.kind==="transfer"&&destination)walletBalances[destination.id]=money(walletBalances[destination.id]+row.amount);
  }
  for(const [id,amount] of Object.entries(walletBalances)) {
    const total=totals.get(accounts.get(id)!.currencyCode)!;
    total.balance=money(total.balance+amount);
  }
  return {totals:[...totals.values()].map(row=>({...row,expense:Math.max(0,row.expense)})).sort((a,b)=>a.currency.localeCompare(b.currency)),walletBalances,unscopedTransactionIds};
}
