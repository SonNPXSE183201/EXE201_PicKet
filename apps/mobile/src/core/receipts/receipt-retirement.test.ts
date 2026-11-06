import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { purgeReceiptOwner, receiptImageIsOwned, type ReceiptRetirementSource } from "./receipt-retirement";

const a="aaaaaaaa-1111-4111-8111-111111111111", b="bbbbbbbb-1111-4111-8111-111111111111";
const temp="cccccccc-1111-4111-8111-111111111111";
function fixture() {
  const db=new DatabaseSync(":memory:");
  db.exec("CREATE TABLE pending_receipt_drafts(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,image_uri TEXT NOT NULL,payload TEXT)");
  const prefix="file:///private/documents/receipt-drafts/";
  db.prepare("INSERT INTO pending_receipt_drafts VALUES (?,?,?,?)").run(a,"a",prefix+a+".jpg","corrupt request payload");
  db.prepare("INSERT INTO pending_receipt_drafts VALUES (?,?,?,?)").run(b,"b",prefix+b+".jpg","other private payload");
  const files=new Set([prefix+a+".jpg",prefix+a+"-"+temp+".tmp",prefix+b+".jpg",prefix+"unattributed.jpg","file:///source/original.jpg",prefix+"a/new.enc",prefix+"device-guest/guest.jpg"]);
  const source:ReceiptRetirementSource={
    root:"file:///private/documents/",isRetired:async()=>true,
    directory:(root,owner)=>root+"receipt-drafts/"+owner,
    files:async()=>[...files],
    removeFile:async uri=>{files.delete(uri);},
    removeDirectory:async uri=>{for(const file of files)if(file.startsWith(uri+"/"))files.delete(file);},
    database:async()=>({
      getAllAsync:async<T>(sql:string,...args:string[])=>db.prepare(sql).all(...args) as T[],
      withExclusiveTransactionAsync:async action=>{
        db.exec("BEGIN EXCLUSIVE");
        try{await action({runAsync:async(sql,...args)=>db.prepare(sql).run(...args)});db.exec("COMMIT");}
        catch(error){db.exec("ROLLBACK");throw error;}
      },
    }),
  };
  return {db,source,files,prefix};
}

test("receipt purge removes the owned directory and attributable legacy image/temp files without decoding payloads",async()=>{
  const f=fixture();try{
    await purgeReceiptOwner("a",f.source);await purgeReceiptOwner("a",f.source);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM pending_receipt_drafts WHERE user_id='a'").get()?.count,0);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM pending_receipt_drafts WHERE user_id='b'").get()?.count,1);
    assert.deepEqual([...f.files].sort(),[f.prefix+b+".jpg",f.prefix+"unattributed.jpg","file:///source/original.jpg",f.prefix+"device-guest/guest.jpg"].sort());
  }finally{f.db.close();}
});

test("corrupt legacy references never authorize deleting an external or another owner's photo",async()=>{
  const f=fixture();try{
    f.db.prepare("UPDATE pending_receipt_drafts SET image_uri=? WHERE user_id='a'").run("file:///source/original.jpg");
    f.files.add(f.prefix+"../source/original.jpg");f.files.add(f.prefix+a+"%2fsecret.jpg");
    await purgeReceiptOwner("a",f.source);
    assert.ok(f.files.has("file:///source/original.jpg"));assert.ok(f.files.has(f.prefix+b+".jpg"));
    assert.ok(f.files.has(f.prefix+"../source/original.jpg"));assert.ok(f.files.has(f.prefix+a+"%2fsecret.jpg"));
  }finally{f.db.close();}
});

test("ambiguous shared legacy files referenced by another owner are preserved",async()=>{
  const f=fixture();try{
    f.db.prepare("UPDATE pending_receipt_drafts SET image_uri=? WHERE user_id='b'").run(f.prefix+a+".jpg");
    await purgeReceiptOwner("a",f.source);assert.ok(f.files.has(f.prefix+a+".jpg"));
  }finally{f.db.close();}
});

test("file failure retains attribution rows; row failure is retryable without decrypting missing images",async()=>{
  const f=fixture();try{
    await assert.rejects(purgeReceiptOwner("a",{...f.source,removeFile:async()=>{throw Error("file locked");}}),/file locked/);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM pending_receipt_drafts WHERE user_id='a'").get()?.count,1);
    f.db.exec("CREATE TRIGGER fail_erasure BEFORE DELETE ON pending_receipt_drafts BEGIN SELECT RAISE(ABORT,'disk error'); END");
    await assert.rejects(purgeReceiptOwner("a",f.source),/disk error/);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM pending_receipt_drafts WHERE user_id='a'").get()?.count,1);
    f.db.exec("DROP TRIGGER fail_erasure");await purgeReceiptOwner("a",f.source);
  }finally{f.db.close();}
});

test("retirement and exact absolute directory validation precede any file erasure",async()=>{
  const f=fixture();let removed=0;try{
    const source={...f.source,removeDirectory:async()=>{removed++;},removeFile:async()=>{removed++;}};
    await assert.rejects(purgeReceiptOwner("a",{...source,isRetired:async()=>false}),/retired/);
    await assert.rejects(purgeReceiptOwner("../b",source),/owner/);
    await assert.rejects(purgeReceiptOwner("a",{...source,directory:()=>f.prefix+"b"}),/directory/);
    for(const root of ["https://example.test/","file:///private/../outside/","file:///private/%2f/","invalid-url"])
      await assert.rejects(purgeReceiptOwner("a",{...source,root}),/directory/);
    assert.equal(removed,0);
  }finally{f.db.close();}
});

test("native receipt writes/readbacks, stable request pinning and progress all use the common owner fence",()=>{
  const source=readFileSync(new URL("./pending-receipt.ts",import.meta.url),"utf8");
  const retire=readFileSync(new URL("../../features/auth/account-local-retirement.ts",import.meta.url),"utf8");
  assert.match(source,/withLocalOwnerAccess\(input.userId/);
  assert.match(source,/withLocalOwnerAccess\(draft.userId/);
  assert.match(source,/new Directory\(Paths.document, "receipt-drafts", input.userId\)/);
  assert.match(source,/getStoredPendingReceiptDraft/);
  assert.match(retire,/await purgeRetiredReceiptOwner\(owner\)/);
});

test("pending receipt image ownership accepts only its UUID filename in the current or legacy app namespace",()=>{
  const root="file:///private/documents/";
  assert.equal(receiptImageIsOwned(root,"a",a,root+"receipt-drafts/a/"+a+".jpg"),true);
  assert.equal(receiptImageIsOwned(root,"a",a,root+"receipt-drafts/"+a+".webp"),true);
  for(const uri of [root+"receipt-drafts/b/"+a+".jpg",root+"receipt-drafts/a/"+b+".jpg",root+"receipt-drafts/a/../b/"+a+".jpg",root+"receipt-drafts/a/"+a+".jpg?copy=1","file:///source/original.jpg"])
    assert.equal(receiptImageIsOwned(root,"a",a,uri),false);
});

test("real filesystem legacy and private receipt cleanup preserves other owners and original photos",async()=>{
  const f=fixture();
  const artifacts=resolve(fileURLToPath(new URL("../../../../../.artifacts/",import.meta.url)));
  mkdirSync(artifacts,{recursive:true});const temporary=mkdtempSync(join(artifacts,"receipt erasure-"));
  const documentRoot=join(temporary,"documents"),shared=join(documentRoot,"receipt-drafts");
  const privateDirectory=join(shared,"a"),guestDirectory=join(shared,"device-guest");
  const root=pathToFileURL(documentRoot).href+"/";
  try{
    mkdirSync(privateDirectory,{recursive:true});mkdirSync(guestDirectory,{recursive:true});
    for(const file of [join(shared,a+".jpg"),join(shared,a+"-"+temp+".tmp"),join(shared,b+".jpg"),join(shared,"unattributed.jpg"),join(privateDirectory,"orphan.jpg"),join(guestDirectory,"guest.jpg"),join(temporary,"original.jpg")])writeFileSync(file,"synthetic receipt");
    f.db.prepare("UPDATE pending_receipt_drafts SET image_uri=? WHERE user_id='a'").run(pathToFileURL(join(shared,a+".jpg")).href);
    f.db.prepare("UPDATE pending_receipt_drafts SET image_uri=? WHERE user_id='b'").run(pathToFileURL(join(shared,b+".jpg")).href);
    const source={...f.source,root,
      files:async()=>readdirSync(shared,{withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>pathToFileURL(join(shared,entry.name)).href),
      removeDirectory:async(uri:string)=>{
        const target=resolve(fileURLToPath(uri));assert.equal(target,privateDirectory);
        assert.ok(target.startsWith(resolve(temporary)+sep));rmSync(target,{recursive:true,force:true});
      },
      removeFile:async(uri:string)=>{
        const target=resolve(fileURLToPath(uri));assert.equal(dirname(target),shared);
        assert.ok(target.startsWith(resolve(temporary)+sep));rmSync(target,{force:true});
      },
    };
    await purgeReceiptOwner("a",source);await purgeReceiptOwner("a",source);
    assert.equal(existsSync(privateDirectory),false);assert.equal(existsSync(join(shared,a+".jpg")),false);
    for(const file of [join(shared,b+".jpg"),join(shared,"unattributed.jpg"),join(guestDirectory,"guest.jpg"),join(temporary,"original.jpg")])assert.equal(existsSync(file),true);
  }finally{f.db.close();assert.equal(dirname(resolve(temporary)),artifacts);rmSync(temporary,{recursive:true,force:true});}
});
