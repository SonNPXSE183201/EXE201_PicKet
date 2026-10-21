import type { PicketApiClient } from '@picket/api-client';
import type { Transaction,TransactionSplit } from '@picket/domain';
import { vietnamDate } from './overview';
export async function loadSpendingSplits(api:PicketApiClient,token:string,rows:Transaction[],month:string){
 const ids=new Set<string>();for(const row of rows){if(row.deletedAt||vietnamDate(row.occurredAt).slice(0,7)!==month)continue;if(row.kind==='expense')ids.add(row.id);if(row.refundOfTransactionId){ids.add(row.id);ids.add(row.refundOfTransactionId);}}
 const all=[...ids],splits:TransactionSplit[]=[];for(let i=0;i<all.length;i+=25)splits.push(...(await api.listTransactionSplitsByIds(token,all.slice(i,i+25))).splits);return splits;
}
