import {decodeReconciliationRequest} from "../../features/transactions/reconciliation-attempt";
export type GuestReconciliationReceipt={id:string;payload:string;difference:number};
export function validateReconciliationReceipts(value:unknown):asserts value is GuestReconciliationReceipt[]|undefined {
  if(value===undefined)return;
  if(!Array.isArray(value)||value.length>50_000)throw new Error("Invalid reconciliation history");
  const ids=new Set<string>();
  for(const row of value){
    if(!row||typeof row!=="object"||typeof row.id!=="string"||!row.id||row.id.length>200||ids.has(row.id)||
      typeof row.payload!=="string"||row.payload.length>2_100_000||!decodeReconciliationRequest(row.payload)||
      !Number.isSafeInteger(row.difference)||Math.abs(row.difference)>9e12)throw new Error("Invalid reconciliation history");
    ids.add(row.id);
  }
}
