import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { getAvailablePurchases, useIAP, type UseIAPOptions } from "expo-iap";
import { useAuth } from "@/features/auth/auth-context";
import { picketApi } from "@/core/api/client";
import { refreshOwnedPurchases } from "./refresh-purchases";
import { verifyAndFinishPurchase } from "./billing-policy";
import { createPurchaseRecovery } from "./purchase-recovery";

type BillingContext=ReturnType<typeof useIAP>&{revision:number;register:(options:UseIAPOptions)=>()=>void};
const Context=createContext<BillingContext|null>(null);

/** One native Billing connection for the authenticated application tree. */
export function PlayBillingProvider({children}:{children:React.ReactNode}){
  const {session,localMode}=useAuth();
  if(Platform.OS!=="android"||!session||localMode)return children;
  return <ConnectedBilling key={session.user.id} accessToken={session.access_token}>{children}</ConnectedBilling>;
}

function ConnectedBilling({children,accessToken}:{children:React.ReactNode;accessToken:string}){
  const listeners=useRef<UseIAPOptions|null>(null);
  const register=useCallback((options:UseIAPOptions)=>{
    listeners.current=options;
    return()=>{if(listeners.current===options)listeners.current=null;};
  },[]);
  const [revision,setRevision]=useState(0);
  const active=useRef(true);
  const purchaseRequests=useRef(new AbortController());
  const api=useIAP({
    onPurchaseSuccess:purchase=>{
      if(!active.current)return;
      if(listeners.current?.onPurchaseSuccess){listeners.current.onPurchaseSuccess(purchase);return;}
      const backend=picketApi;
      if(!backend)return;
      void verifyAndFinishPurchase(purchase,request=>backend.verifyPlayPurchase(accessToken,request,purchaseRequests.current.signal),async()=>{
        if(active.current)await api.finishTransaction({purchase,isConsumable:false});
      }).then(()=>{if(active.current)setRevision(value=>value+1);}).catch(()=>undefined);
    },
    onPurchaseError:error=>listeners.current?.onPurchaseError?.(error),
    onError:error=>listeners.current?.onError?.(error),
  });
  useEffect(()=>{
    active.current=true;
    if(purchaseRequests.current.signal.aborted)purchaseRequests.current=new AbortController();
    return()=>{active.current=false;purchaseRequests.current.abort();};
  },[]);
  const {connected,finishTransaction}=api;
  useEffect(()=>{
    const backend=picketApi;
    if(!connected||!backend)return;
    let current=true;
    const controller=new AbortController();
    const recovery=createPurchaseRecovery(async()=>{
        const purchases=await getAvailablePurchases({includeSuspendedAndroid:false});
        if(!current)return false;
        const result=await refreshOwnedPurchases(purchases,request=>{
          const purchase=purchases.find(item=>item.purchaseToken===request.purchaseToken);
          if(!purchase)throw new Error("Purchase no longer available");
          return verifyAndFinishPurchase(purchase,value=>backend.verifyPlayPurchase(accessToken,value,controller.signal),async()=>{
            if(!current)throw new Error("Billing session changed");
            await finishTransaction({purchase,isConsumable:false});
          });
        },()=>current);
        if(current){
          if(result.failed===0)setRevision(value=>value+1);
        }
        return result.failed===0;
    });
    const retries:ReturnType<typeof setTimeout>[]=[];
    const resume=()=>{
      retries.splice(0).forEach(clearTimeout);
      void recovery.refresh(true);
      for(const delay of [2000,6000,15000])retries.push(setTimeout(()=>{if(current&&AppState.currentState==="active")void recovery.refresh(true);},delay));
    };
    resume();
    const listener=AppState.addEventListener("change",state=>{if(state==="active")resume();});
    const timer=setInterval(()=>{if(AppState.currentState==="active")void recovery.refresh();},60*60*1000);
    return()=>{current=false;recovery.stop();controller.abort();listener.remove();clearInterval(timer);retries.forEach(clearTimeout);};
  },[accessToken,connected,finishTransaction]);
  return <Context.Provider value={{...api,revision,register}}>{children}</Context.Provider>;
}

export function usePlayBilling(options:UseIAPOptions){
  const value=useContext(Context);
  if(!value)throw new Error("Google Play Billing is unavailable");
  const {register}=value;
  useEffect(()=>register(options),[register,options]);
  return value;
}
