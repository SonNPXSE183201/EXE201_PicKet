import type { LearningAiConsent, LearningAiJob, LearningAiRequest, LearningAiQueuedJob, LearningAiStatement } from "@picket/domain";

export interface LearningAiApi {
  learningAiConsent(token:string,signal?:AbortSignal):Promise<unknown>;
  setLearningAiConsent(token:string,accepted:boolean,signal?:AbortSignal):Promise<unknown>;
  enqueueLearningAi(token:string,request:LearningAiRequest,key:string,signal?:AbortSignal):Promise<unknown>;
  learningAiJob(token:string,id:string,signal?:AbortSignal):Promise<unknown>;
  deleteLearningAiHistory(token:string,signal?:AbortSignal):Promise<unknown>;
}
export interface LearningAiState {
  consent:LearningAiConsent|null;
  job:LearningAiJob|null;
  busy:boolean;
  error:"unavailable"|"quota"|null;
}

export function createLearningAiSession(api:LearningAiApi,token:string,newKey:()=>string) {
  let accessToken=token;
  let state:LearningAiState={consent:null,job:null,busy:false,error:null};
  let active=true;
  let version=0;
  let controller=new AbortController();
  let request:{locale:"vi"|"en";key:string}|null=null;
  const listeners=new Set<()=>void>();
  const update=(patch:Partial<LearningAiState>)=>{
    state={...state,...patch};
    if(active)for(const listener of listeners)listener();
  };
  async function run(action:(signal:AbortSignal,current:()=>boolean)=>Promise<void>,replace=false){
    if(!active || (state.busy&&!replace))return;
    controller.abort();controller=new AbortController();
    const currentVersion=++version;
    const current=()=>active&&version===currentVersion;
    update({busy:true,error:null});
    try{await action(controller.signal,current);}
    catch(error){if(current())update({error:typeof error==="object"&&error!==null&&"status" in error&&error.status===429?"quota":"unavailable"});}
    finally{if(current())update({busy:false});}
  }
  return {
    start:()=>{if(!active){active=true;version++;update({consent:null,job:null,busy:false,error:null});}},
    setAccessToken:(next:string)=>{
      if(!next.trim())throw new Error("Access token required");
      if(next===accessToken)return;
      accessToken=next;version++;controller.abort();controller=new AbortController();
      update({busy:false});
    },
    snapshot:()=>state,
    subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},
    load:()=>run(async(signal,current)=>{
      const consent=parseConsent(await api.learningAiConsent(accessToken,signal));
      if(!current())return;
      if(!consent.accepted||consent.generation!==state.consent?.generation){request=null;update({job:null});}
      update({consent});
    }),
    generate:(locale:"vi"|"en")=>run(async(signal,current)=>{
      if(!state.consent?.accepted)throw new Error("Explicit consent required");
      // Retain the same key after a lost response; no automatic POST replay.
      if(!request||request.locale!==locale)request={locale,key:newKey()};
      const job=parseJob(await api.enqueueLearningAi(accessToken,{scenarioId:"cash-gap-v1",locale},request.key,signal),true);
      if(current())update({job:{...job,statementIds:[]}});
    }),
    poll:()=>run(async(signal,current)=>{
      const job=state.job;
      if(!job||!state.consent?.accepted||["failed","cancelled","expired"].includes(job.status))return;
      let response:unknown;
      try{response=await api.learningAiJob(accessToken,job.id,signal);}
      catch(error){
        if(typeof error==="object"&&error!==null&&"status" in error&&error.status===404){
          if(current()){request=null;update({job:{id:job.id,status:"cancelled",statementIds:[]}});}
          return;
        }
        throw error;
      }
      const result=parseJob(response);
      if(result.id!==job.id)throw new Error("Mismatched job");
      if(current()){
        update({job:result as LearningAiJob});
        if(["completed","failed","cancelled","expired"].includes(result.status))request=null;
      }
    }),
    setConsent:(accepted:boolean)=>{
      // Hide old output immediately. A failed revoke remains visibly failed.
      request=null;update({job:null});
      return run(async(signal,current)=>{
        const consent=parseConsent(await api.setLearningAiConsent(accessToken,accepted,signal));
        if(consent.accepted!==accepted)throw new Error("Consent not confirmed");
        if(current())update({consent});
      },true);
    },
    clearHistory:()=>{
      request=null;update({job:null});
      return run(async(signal,current)=>{
        await api.deleteLearningAiHistory(accessToken,signal);
        if(current())update({job:null});
      },true);
    },
    dispose:()=>{active=false;version++;controller.abort();listeners.clear();state={consent:null,job:null,busy:false,error:null};},
  };
}

function parseConsent(value:unknown):LearningAiConsent{
  if(typeof value!=="object"||value===null||!("accepted" in value)||typeof value.accepted!=="boolean"||
    !("generation" in value)||!Number.isSafeInteger(value.generation)||(value.generation as number)<0||
    !("policyVersion" in value)||value.policyVersion!==1)throw new Error("Invalid consent");
  return {accepted:value.accepted,generation:value.generation as number,policyVersion:1};
}
function parseJob(value:unknown,queued=false):LearningAiQueuedJob|LearningAiJob{
  if(typeof value!=="object"||value===null||!("id" in value)||typeof value.id!=="string"||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)||
    !("status" in value)||!["queued","claimed","dispatched","completed","failed","cancelled","expired"].includes(String(value.status)))throw new Error("Invalid job");
  const job={id:value.id,status:value.status as LearningAiJob["status"]};
  if(queued)return job;
  const ids="statementIds" in value?value.statementIds:null;
  if(!Array.isArray(ids)||ids.length>3||new Set(ids).size!==ids.length||
    ids.some(id=>!["timing","buffer","incomplete-records"].includes(id))||
    (job.status==="completed"?ids.length===0:ids.length>0))throw new Error("Invalid approved explanation");
  return {...job,statementIds:ids as LearningAiStatement[]};
}
