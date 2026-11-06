import { useEffect } from "react";
import { AppState } from "react-native";
import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import { curriculum } from "./curriculum";
import { learningAttempts, learningProgress, weeklyPractice } from "./progress-storage";
import { submitPendingLearningAttempt } from "./cloud-sync";
import { pendingLearningActivity } from "./pending-activity";

export function LearningSync() {
  const { session, localMode }=useAuth();
  useEffect(()=>{
    const api=picketApi;
    if (!session || localMode || !api || !curriculum.publicationGate.publishable ||
        process.env.EXPO_PUBLIC_LEARNING_CLOUD_ENABLED!=="true") return;
    let active=true;
    const controller=new AbortController();
    const sync=()=>{
      if (!active) return;
      void learningAttempts.drain(session.user.id,async(row)=>{
        if (!active) throw new Error("Learning session changed");
        await submitPendingLearningAttempt(row,(request,key)=>api.submitLearningAttempt(session.access_token,request,key,controller.signal));
      }).then(async()=>{
        if(!active)return;
        const result=await api.learningProgress(session.access_token,controller.signal);
        if(active)await learningProgress.mergeVerified(session.user.id,result.progress);
        if(!active)return;
        const [progress,practice]=await Promise.all([learningProgress.load(session.user.id),weeklyPractice.load(session.user.id)]);
        if(!active)return;
        // Source records are the durable outbox: semantic identities on the
        // server make repeated uploads safe without granting extra XP.
        let activity=await api.learningActivity(session.access_token,controller.signal);
        if(!active)return;
        await learningProgress.mergeReviews(session.user.id,activity.reviews);
        if(!active)return;
        await weeklyPractice.mergeVerified(session.user.id,activity.practice);
        const events=pendingLearningActivity(progress,practice,result.progress,activity,new Date().toISOString().slice(0,10));
        for(let index=0;index<events.length;index+=100){
          if(!active)return;
          activity=await api.syncLearningActivity(session.access_token,events.slice(index,index+100),controller.signal);
        }
        if(!active)return;
        await learningProgress.mergeReviews(session.user.id,activity.reviews);
        if(active)await weeklyPractice.mergeVerified(session.user.id,activity.practice);
      }).catch(()=>undefined); // Retain durable attempts; core learning stays usable.
    };
    sync();
    const listener=AppState.addEventListener("change",state=>{if(state==="active")sync();});
    return ()=>{active=false;controller.abort();listener.remove();};
  },[session,localMode]);
  return null;
}
