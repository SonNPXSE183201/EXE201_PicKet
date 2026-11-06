export type CaptureRetirementSource = {
  isRetired(owner:string):Promise<boolean>;
  roots:string[];
  directory(root:string,owner:string):string;
  removeDirectory(uri:string):Promise<void>;
  database():Promise<{withExclusiveTransactionAsync(operation:(tx:{runAsync(sql:string,...args:string[]):Promise<unknown>})=>Promise<void>):Promise<void>}>;
};

export const captureOwnerSchema = `
CREATE TABLE IF NOT EXISTS capture_drafts (owner_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS capture_ocr_intents (owner_id TEXT NOT NULL, capture_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(owner_id,capture_id));
CREATE TABLE IF NOT EXISTS capture_picker_attempts (owner_id TEXT PRIMARY KEY NOT NULL, operation_id TEXT NOT NULL);
`;

export async function purgeCaptureOwner(owner:string,source:CaptureRetirementSource):Promise<void>{
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(owner)) throw Error("Invalid capture owner");
  if (!await source.isRetired(owner)) throw Error("Capture owner must be retired before erasure");
  if (source.roots.length !== 2 || new Set(source.roots).size !== 2) throw Error("Invalid capture directory roots");
  // Validate every absolute target before deleting anything, including retries.
  const targets = source.roots.map(root => {
    const base = root.endsWith("/") ? root : `${root}/`;
    let parsed:URL;
    try {parsed = new URL(base);}catch{throw Error("Invalid capture directory root");}
    if (parsed.protocol !== "file:" || parsed.host || parsed.search || parsed.hash || parsed.href !== base
      || /%2e|%2f|%5c|\\/i.test(base)) throw Error("Invalid capture directory root");
    const target = source.directory(root,owner);
    if (target !== `${base}capture-drafts/${owner}`) throw Error("Invalid owned capture directory");
    return target;
  });
  if (new Set(targets).size !== 2) throw Error("Invalid capture directory roots");
  for (const target of targets) await source.removeDirectory(target);
  const db = await source.database();
  await db.withExclusiveTransactionAsync(async tx => {
    await tx.runAsync("DELETE FROM capture_drafts WHERE owner_id = ?",owner);
    await tx.runAsync("DELETE FROM capture_ocr_intents WHERE owner_id = ?",owner);
    await tx.runAsync("DELETE FROM capture_picker_attempts WHERE owner_id = ?",owner);
  });
}
