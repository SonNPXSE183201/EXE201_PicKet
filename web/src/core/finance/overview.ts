import type { FinancialAccount, Transaction,TransactionSplit } from '@picket/domain';

export function vietnamDate(value: string) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function walletBalances(accounts: Pick<FinancialAccount,'id'|'openingBalance'>[], transactions:Transaction[]) {
  const balances:Record<string,number>=Object.fromEntries(accounts.map(a=>[a.id,a.openingBalance]));
  for(const row of transactions) {
    if(row.deletedAt) continue;
    if(row.accountId in balances) balances[row.accountId]+=((row.kind==='income'||row.kind==='refund')?row.amount:-row.amount);
    if(row.kind==='transfer' && row.destinationAccountId && row.destinationAccountId in balances) balances[row.destinationAccountId]+=row.amount;
  }
  return balances;
}
export function monthSummary(transactions:Transaction[],month:string) {
  let income=0,expense=0;
  for(const row of transactions) {
    if(row.deletedAt || vietnamDate(row.occurredAt).slice(0,7)!==month) continue;
    if(row.kind==='expense') expense+=row.amount;
    if(row.kind==='refund') expense-=row.amount;
    if(row.kind==='income') {if(row.refundOfTransactionId) expense-=row.amount;else income+=row.amount;}
  }
  return {income,expense};
}

/** Same allocation rule as Expo: explicit refund splits win, otherwise prorate the original. */
export function categorySpending(transactions:Transaction[],month:string,splits:Pick<TransactionSplit,'transactionId'|'categoryId'|'amount'>[]) {
  const live=transactions.filter(t=>!t.deletedAt),byId=new Map(live.map(t=>[t.id,t])),totals=new Map<string,number>();
  const parts=new Map<string,typeof splits>();for(const part of splits)parts.set(part.transactionId,[...(parts.get(part.transactionId)??[]),part]);
  const allocation=(t:Transaction)=>parts.get(t.id)?.length?parts.get(t.id)!:[{categoryId:t.categoryId??'uncategorized',amount:t.amount}];
  for(const t of live){if(vietnamDate(t.occurredAt).slice(0,7)!==month)continue;
    if(t.kind==='expense')for(const p of allocation(t))totals.set(p.categoryId,(totals.get(p.categoryId)??0)+p.amount);
    if((t.kind==='refund'||t.kind==='income')&&t.refundOfTransactionId){const original=byId.get(t.refundOfTransactionId);if(original?.kind!=='expense'||original.amount<=0)continue;const explicit=parts.get(t.id);for(const p of explicit?.length?explicit:allocation(original).map(p=>({...p,amount:Math.round(t.amount*p.amount/original.amount)})))totals.set(p.categoryId,(totals.get(p.categoryId)??0)-p.amount);}
  }
  return [...totals].map(([id,amount])=>({id,amount})).filter(r=>r.amount!==0).sort((a,b)=>b.amount-a.amount);
}
