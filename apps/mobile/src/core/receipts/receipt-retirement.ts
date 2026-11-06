export type ReceiptRetirementSource={
  root:string;
  isRetired(owner:string):Promise<boolean>;
  directory(root:string,owner:string):string;
  files(root:string):Promise<string[]>;
  removeFile(uri:string):Promise<void>;
  removeDirectory(uri:string):Promise<void>;
  database():Promise<{
    getAllAsync<T>(sql:string,...args:string[]):Promise<T[]>;
    withExclusiveTransactionAsync(action:(tx:{runAsync(sql:string,...args:string[]):Promise<unknown>})=>Promise<void>):Promise<void>;
  }>;
};

const uuid="[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}";
const imageName=new RegExp(`^(${uuid})\\.(?:jpe?g|png|webp)$`,"i");
const tempName=new RegExp(`^(${uuid})-${uuid}\\.tmp$`,"i");
function ownedDirectory(root:string,owner:string){
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(owner))throw Error("Invalid receipt owner");
  const base=root.endsWith("/")?root:`${root}/`;
  let parsed:URL;try{parsed=new URL(base);}catch{throw Error("Invalid receipt directory root");}
  if(parsed.protocol!=="file:"||parsed.host||parsed.search||parsed.hash||parsed.href!==base||/%2e|%2f|%5c|\\/i.test(base))throw Error("Invalid receipt directory root");
  return {base,shared:`${base}receipt-drafts/`,privateDirectory:`${base}receipt-drafts/${owner}`};
}

export function receiptImageIsOwned(root:string,owner:string,id:string,uri:string){
  const {shared,privateDirectory}=ownedDirectory(root,owner);
  const prefixes=[shared,`${privateDirectory}/`];
  return prefixes.some(prefix=>{
    if(!uri.startsWith(prefix))return false;
    const match=imageName.exec(uri.slice(prefix.length));
    return match?.[1]===id;
  });
}

export async function purgeReceiptOwner(owner:string,source:ReceiptRetirementSource):Promise<void>{
  const {shared,privateDirectory}=ownedDirectory(source.root,owner);
  if(!await source.isRetired(owner))throw Error("Receipt owner must be retired before erasure");
  const target=source.directory(source.root,owner);
  if(target!==privateDirectory)throw Error("Invalid owned receipt directory");
  const db=await source.database();
  const rows=await db.getAllAsync<{id:string;image_uri:string}>("SELECT id,image_uri FROM pending_receipt_drafts WHERE user_id = ?",owner);
  const others=await db.getAllAsync<{id:string;image_uri:string}>("SELECT id,image_uri FROM pending_receipt_drafts WHERE user_id <> ?",owner);
  const ambiguousIds=new Set(others.map(row=>row.id.toLowerCase()));
  const references=new Set(others.map(row=>row.image_uri.toLowerCase()));
  const ownedIds=new Set(rows.filter(row=>!ambiguousIds.has(row.id.toLowerCase())).map(row=>row.id));
  const files=(await source.files(shared)).filter(uri=>{
    if(!uri.startsWith(shared)||references.has(uri.toLowerCase()))return false;
    const name=uri.slice(shared.length);
    const match=imageName.exec(name)??tempName.exec(name);
    return Boolean(match&&ownedIds.has(match[1]));
  });
  // Keep legacy attribution rows until all their owned files have been removed.
  await source.removeDirectory(target);
  for(const uri of files)await source.removeFile(uri);
  await db.withExclusiveTransactionAsync(async tx=>{
    await tx.runAsync("DELETE FROM pending_receipt_drafts WHERE user_id = ?",owner);
  });
}
