import { curriculum, gradeQuiz } from "./curriculum";
export type PendingLearningAttempt = { key:string; lessonId:string; contentVersion:number; answers:number[] };
type Document = {schemaVersion:1;attempts:PendingLearningAttempt[]};
function validate(row: PendingLearningAttempt) {
  if (!row || !/^[A-Za-z0-9._:-]{8,128}$/.test(row.key)) throw new Error("Invalid attempt key");
  const lesson=curriculum.lessons.find(item=>item.lessonId===row.lessonId && item.version===row.contentVersion);
  if (!lesson || !Array.isArray(row.answers)) throw new Error("Unknown lesson attempt");
  gradeQuiz(lesson,row.answers);
  return {key:row.key,lessonId:row.lessonId,contentVersion:row.contentVersion,answers:[...row.answers]};
}
function parse(value: unknown): Document {
  if (value == null) return {schemaVersion:1,attempts:[]};
  const doc=value as Document;
  if (doc.schemaVersion!==1 || !Array.isArray(doc.attempts) || doc.attempts.length>100) throw new Error("Invalid attempt outbox");
  const keys=new Set<string>();
  const attempts=doc.attempts.map(row=>{
    const checked=validate(row);
    if(keys.has(checked.key)) throw new Error("Duplicate attempt key");
    keys.add(checked.key);return checked;
  });
  return {schemaVersion:1,attempts};
}
export function createAttemptOutbox(storage:{read(owner:string):Promise<unknown>;write(owner:string,value:Document):Promise<void>}) {
  const pending=new Map<string,Promise<unknown>>(),draining=new Map<string,Promise<void>>();
  function checkOwner(owner:string) {if(!/^[A-Za-z0-9_-]{1,200}$/.test(owner))throw new Error("Invalid learning owner");}
  async function load(owner:string) {
    checkOwner(owner);await pending.get(owner)?.catch(()=>undefined);
    return parse(await storage.read(owner)).attempts;
  }
  async function mutate(owner:string,change:(rows:PendingLearningAttempt[])=>PendingLearningAttempt[]) {
    checkOwner(owner);
    const operation=(pending.get(owner)??Promise.resolve()).catch(()=>undefined).then(async()=>{
      const current=parse(await storage.read(owner));
      const next=parse({...current,attempts:change(current.attempts)});
      await storage.write(owner,next);
    });
    pending.set(owner,operation);
    try {await operation;}finally{if(pending.get(owner)===operation)pending.delete(owner);}
  }
  async function enqueue(owner:string,row:PendingLearningAttempt) {
    const checked=validate(row);
    await mutate(owner,rows=>{
      const previous=rows.find(item=>item.key===checked.key);
      if(previous && JSON.stringify(previous)!==JSON.stringify(checked))throw new Error("Attempt key payload mismatch");
      return previous ? rows : [...rows,checked];
    });
  }
  function drain(owner:string,submit:(row:PendingLearningAttempt)=>Promise<void>):Promise<void> {
    checkOwner(owner);
    const active=draining.get(owner);if(active)return active;
    const operation=(async()=>{
      for(const row of await load(owner)) {
        await submit(row);
        await mutate(owner,rows=>rows.filter(item=>item.key!==row.key));
      }
    })();
    draining.set(owner,operation);
    void operation.finally(()=>{if(draining.get(owner)===operation)draining.delete(owner);}).catch(()=>undefined);
    return operation;
  }
  return {load,enqueue,drain};
}
