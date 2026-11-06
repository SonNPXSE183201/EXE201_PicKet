import { readOfflineCache,writeOfflineCache } from "@/core/sync/offline-cache";
import { createSettlementStore } from "./settlement-store";
export const cashflowSettlements=createSettlementStore({
 read:async owner=>(await readOfflineCache(owner,"cashflow-settlements"))?.value,
 write:(owner,value)=>writeOfflineCache(owner,"cashflow-settlements",value),
});
