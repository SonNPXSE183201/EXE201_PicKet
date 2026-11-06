export type KeepsakeRetirementSource={
  root:string;
  isRetired(owner:string):Promise<boolean>;
  directory(root:string,namespace:"keepsakes"|"keepsake-cloud-cache",owner:string):string;
  removeDirectory(uri:string):Promise<void>;
  database():Promise<{withExclusiveTransactionAsync(action:(tx:{runAsync(sql:string,...args:string[]):Promise<unknown>})=>Promise<void>):Promise<void>}>;
};
export async function purgeKeepsakeOwner(owner:string,source:KeepsakeRetirementSource):Promise<void>{
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(owner))throw Error("Invalid keepsake owner");
  const base=source.root.endsWith("/")?source.root:`${source.root}/`;
  let parsed:URL;try{parsed=new URL(base);}catch{throw Error("Invalid keepsake directory root");}
  if(parsed.protocol!=="file:"||parsed.host||parsed.search||parsed.hash||parsed.href!==base||/%2e|%2f|%5c|\\/i.test(base))throw Error("Invalid keepsake directory root");
  if(!await source.isRetired(owner))throw Error("Keepsake owner must be retired before erasure");
  const targets=(["keepsakes","keepsake-cloud-cache"] as const).map(namespace=>{
    const target=source.directory(source.root,namespace,owner);
    if(target!==`${base}${namespace}/${owner}`)throw Error("Invalid owned keepsake directory");
    return target;
  });
  for(const target of targets)await source.removeDirectory(target);
  await (await source.database()).withExclusiveTransactionAsync(async tx=>{
    await tx.runAsync("DELETE FROM keepsakes WHERE user_id = ?",owner);
    await tx.runAsync("DELETE FROM keepsake_photo_cleanup WHERE user_id = ?",owner);
  });
}
