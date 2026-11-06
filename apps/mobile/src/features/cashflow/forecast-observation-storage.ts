import * as Crypto from "expo-crypto";
import {readOfflineCache,writeOfflineCache} from "@/core/sync/offline-cache";
import {createObservationStore} from "./forecast-observation-store";
export const forecastObservations=createObservationStore({
 read:async owner=>(await readOfflineCache(owner,"forecast-observations"))?.value,
 write:(owner,value)=>writeOfflineCache(owner,"forecast-observations",value),
 newId:()=>Crypto.randomUUID(),now:()=>new Date().toISOString(),
});
