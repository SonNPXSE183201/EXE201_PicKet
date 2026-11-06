import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createOwnerCacheLifecycle } from "../../core/sync/owner-cache-lifecycle";
import { purgeKeepsakeOwner, type KeepsakeRetirementSource } from "./keepsake-retirement";

function fixture(){
  const db=new DatabaseSync(":memory:");db.exec("CREATE TABLE keepsakes(id TEXT PRIMARY KEY,user_id TEXT,photo_uri TEXT,payload TEXT);CREATE TABLE keepsake_photo_cleanup(user_id TEXT,item_id TEXT,obsolete_path TEXT,replacement_path TEXT)");
  for(const owner of ["a","b","device-guest"]){
    db.prepare("INSERT INTO keepsakes VALUES(?,?,?,?)").run(owner+"-item",owner,"file:///source/original.jpg","corrupt metadata");
    db.prepare("INSERT INTO keepsake_photo_cleanup VALUES(?,?,?,?)").run(owner,owner+"-item","old","new");
  }
  const root="file:///private/documents/";
  const files=new Set([root+"keepsakes/a/photo.enc",root+"keepsake-cloud-cache/a/cloud.enc",root+"keepsakes/b/photo.enc",root+"keepsakes/device-guest/photo.enc","file:///source/original.jpg"]);
  const source:KeepsakeRetirementSource={root,isRetired:async()=>true,directory:(base,name,owner)=>base+name+"/"+owner,
    removeDirectory:async target=>{for(const file of files)if(file.startsWith(target+"/"))files.delete(file);},
    database:async()=>({withExclusiveTransactionAsync:async action=>{
      db.exec("BEGIN EXCLUSIVE");try{await action({runAsync:async(sql,...args)=>db.prepare(sql).run(...args)});db.exec("COMMIT");}catch(error){db.exec("ROLLBACK");throw error;}
    }}),
  };return {db,files,source,root};
}

test("keepsake retirement erases both owned image directories and queue tables while preserving guest, another owner and original photos",async()=>{
  const f=fixture();try{
    await purgeKeepsakeOwner("a",f.source);await purgeKeepsakeOwner("a",f.source);
    assert.deepEqual([...f.files].sort(),[f.root+"keepsakes/b/photo.enc",f.root+"keepsakes/device-guest/photo.enc","file:///source/original.jpg"].sort());
    for(const table of ["keepsakes","keepsake_photo_cleanup"]){
      assert.equal(f.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id='a'`).get()?.count,0);
      assert.equal(f.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id='b'`).get()?.count,1);
      assert.equal(f.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE user_id='device-guest'`).get()?.count,1);
    }
  }finally{f.db.close();}
});

test("all keepsake directory targets must match the exact namespace before any deletion",async()=>{
  const f=fixture();let deleted=0;try{
    const source={...f.source,removeDirectory:async()=>{deleted++;}};
    await assert.rejects(purgeKeepsakeOwner("a",{...source,isRetired:async()=>false}),/retired/);
    await assert.rejects(purgeKeepsakeOwner("../b",source),/owner/);
    for(const target of [f.root+"keepsakes/b",f.root+"keepsakes/a/../b",f.root+"keepsakes/a?other=b"])
      await assert.rejects(purgeKeepsakeOwner("a",{...source,directory:(_root,namespace,owner)=>namespace==="keepsake-cloud-cache"?target:f.source.directory(f.root,namespace,owner)}),/directory/);
    for(const root of ["invalid","https://example.test/","file:///private/../outside/","file:///private/%2f/"])
      await assert.rejects(purgeKeepsakeOwner("a",{...source,root}),/directory/);
    assert.equal(deleted,0);
  }finally{f.db.close();}
});

test("keepsake file errors preserve queue rows and SQL rollback remains retryable",async()=>{
  const f=fixture();try{
    await assert.rejects(purgeKeepsakeOwner("a",{...f.source,removeDirectory:async()=>{throw Error("file busy");}}),/file busy/);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM keepsakes WHERE user_id='a'").get()?.count,1);
    f.db.exec("CREATE TRIGGER fail_erasure BEFORE DELETE ON keepsake_photo_cleanup BEGIN SELECT RAISE(ABORT,'disk full'); END");
    await assert.rejects(purgeKeepsakeOwner("a",f.source),/disk full/);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM keepsakes WHERE user_id='a'").get()?.count,1);
    f.db.exec("DROP TRIGGER fail_erasure");await purgeKeepsakeOwner("a",f.source);
  }finally{f.db.close();}
});

test("native keepsake image and SQL writers are fenced and cloud display never recreates a directory outside the fence",()=>{
  const photo=readFileSync(new URL("./keepsake-photo-storage.ts",import.meta.url),"utf8");
  const store=readFileSync(new URL("./keepsake-store.ts",import.meta.url),"utf8");
  const cloud=readFileSync(new URL("./cloud-keepsakes.ts",import.meta.url),"utf8");
  const retire=readFileSync(new URL("../auth/account-local-retirement.ts",import.meta.url),"utf8");
  assert.ok((photo.match(/withLocalOwnerAccess\(owner/g)??[]).length>=2);
  assert.match(store,/withLocalOwnerAccess\(input.userId/);assert.match(store,/withLocalOwnerAccess\(expected.userId/);
  assert.match(store,/purgeKeepsakeOwner/);assert.match(retire,/await purgeRetiredKeepsakeOwner\(owner\)/);
  assert.doesNotMatch(cloud,/directory.create\(/);
  assert.match(cloud,/withLocalOwnerAccess\(userId/);
});

test("retirement drains a dispatched SDK media upload and prevents later uploads from starting",{timeout:5000},async()=>{
  let release!:()=>void,started!:()=>void,calls=0;
  const entered=new Promise<void>(resolve=>{started=resolve;});
  const pending=new Promise<void>(resolve=>{release=resolve;});
  const client=createClient("https://synthetic.invalid","synthetic-publishable",{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async()=>{calls++;started();await pending;return Response.json({Key:"picket-media/a/item.jpg"});}},
  });
  const retired=new Set<string>();
  const lifecycle=createOwnerCacheLifecycle({isRetired:async owner=>retired.has(owner),retire:async owner=>{retired.add(owner);},resume:async owner=>{retired.delete(owner);}});
  const upload=()=>client.storage.from("picket-media").upload("a/item.jpg",new Uint8Array([1,2,3]),{contentType:"image/jpeg",upsert:true});
  const dispatched=lifecycle.run("a",upload);await entered;
  const retirement=lifecycle.retire("a");assert.equal(retired.has("a"),false);
  release();assert.equal((await dispatched).error,null);await retirement;
  await assert.rejects(lifecycle.run("a",upload),/retired/);assert.equal(calls,1);
});
