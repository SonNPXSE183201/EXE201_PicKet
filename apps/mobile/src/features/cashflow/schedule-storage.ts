import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import * as Crypto from "expo-crypto";
import { createScheduleSyncStore } from "./schedule-sync-store";
export const cashflowSchedules=createScheduleSyncStore({
  read:async owner=>(await readOfflineCache(owner,"cashflow-schedules"))?.value,
  write:(owner,value)=>writeOfflineCache(owner,"cashflow-schedules",value),
},()=>Crypto.randomUUID());
