import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";
import { captureOwnerSchema, purgeCaptureOwner, type CaptureRetirementSource } from "./capture-retirement";
import { createPickerRecoveryStore } from "./capture-journal";
import { createOwnerCacheLifecycle } from "../sync/owner-cache-lifecycle";

function fixture() {
  const db = new DatabaseSync(":memory:"); db.exec(captureOwnerSchema);
  for (const owner of ["a", "b", "device-guest"]) {
    db.prepare("INSERT INTO capture_drafts VALUES (?, ?)").run(owner, "corrupt encrypted draft");
    db.prepare("INSERT INTO capture_ocr_intents VALUES (?, ?, ?)").run(owner, "capture", "corrupt OCR result");
    db.prepare("INSERT INTO capture_picker_attempts VALUES (?, ?)").run(owner, "operation");
  }
  const directories = new Set(["file:///private/documents/capture-drafts/a", "file:///private/cache/capture-drafts/a", "file:///private/documents/capture-drafts/b", "file:///private/documents/capture-drafts/device-guest"]);
  const source: CaptureRetirementSource = {
    isRetired: async () => true,
    roots: ["file:///private/documents/", "file:///private/cache/"],
    directory: (root, owner) => `${root}capture-drafts/${owner}`,
    removeDirectory: async uri => { directories.delete(uri); },
    database: async () => ({ withExclusiveTransactionAsync: async operation => {
      db.exec("BEGIN EXCLUSIVE");
      try { await operation({runAsync: async (sql, ...args) => db.prepare(sql).run(...args)}); db.exec("COMMIT"); }
      catch(error) { db.exec("ROLLBACK"); throw error; }
    } }),
  };
  return { db, directories, source };
}

test("retired capture erasure removes only attributed owner directories and all three journal tables without decrypting", async () => {
  const f = fixture();
  try {
    await purgeCaptureOwner("a", f.source); await purgeCaptureOwner("a", f.source);
    assert.deepEqual([...f.directories].sort(), ["file:///private/documents/capture-drafts/b", "file:///private/documents/capture-drafts/device-guest"]);
    for (const table of ["capture_drafts", "capture_ocr_intents", "capture_picker_attempts"]) {
      assert.equal(f.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_id='a'`).get()?.count,0);
      assert.equal(f.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_id='b'`).get()?.count,1);
      assert.equal(f.db.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE owner_id='device-guest'`).get()?.count,1);
    }
  } finally { f.db.close(); }
});

test("all deletion targets are validated before touching any file and active owners cannot be purged", async () => {
  const f = fixture(); let deleted = 0;
  try {
    await assert.rejects(purgeCaptureOwner("a", {...f.source,isRetired:async()=>false}),/retired/);
    const invalid = ["file:///private/documents/capture-drafts/b", "file:///private/documents/capture-drafts/a/../b", "file:///private/documents/capture-drafts/%61", "file:///private/documents/capture-drafts/a?target=b", "file:///private/documents/capture-drafts/a#other", "https://example.test/capture-drafts/a"];
    for (const bad of invalid) await assert.rejects(purgeCaptureOwner("a", {...f.source,
      directory:(root,owner)=>root.includes("/cache/")?bad:f.source.directory(root,owner),removeDirectory:async()=>{deleted++;},
    }),/directory/);
    for (const owner of ["../b", "", "a/b", "a%2fb"]) await assert.rejects(purgeCaptureOwner(owner,f.source),/owner/);
    for (const roots of [[],["file:///one/"],["file:///same/","file:///same/"], ["file:///same/","file:///same"], ["not-a-url",f.source.roots[1]], ["file://foreign/private/",f.source.roots[1]], ["file:///private/../other/",f.source.roots[1]], ["file:///private/%2f/",f.source.roots[1]]]) {
      await assert.rejects(purgeCaptureOwner("a",{...f.source,roots,removeDirectory:async()=>{deleted++;}}),/directory/);
    }
    assert.equal(deleted,0);
  } finally { f.db.close(); }
});

test("real filesystem deletion stays in attributed app directories and preserves another owner, guest and source photo", async () => {
  const f=fixture();
  const artifacts=resolve(fileURLToPath(new URL("../../../../../.artifacts/",import.meta.url)));
  mkdirSync(artifacts,{recursive:true});
  const temporary=mkdtempSync(join(artifacts,"capture-erasure-"));
  const documentRoot=join(temporary,"documents"),cacheRoot=join(temporary,"cache");
  const roots=[documentRoot,cacheRoot].map(path=>pathToFileURL(path).href+"/");
  const owned=[join(documentRoot,"capture-drafts","a"),join(cacheRoot,"capture-drafts","a")];
  const preserved=[join(documentRoot,"capture-drafts","b"),join(documentRoot,"capture-drafts","device-guest")];
  try {
    for (const path of [...owned,...preserved]) {mkdirSync(path,{recursive:true});writeFileSync(join(path,"synthetic.enc"),"synthetic private bytes");}
    const sourcePhoto=join(temporary,"original-photo.jpg");writeFileSync(sourcePhoto,"synthetic original");
    const source={...f.source,roots,removeDirectory:async(uri:string)=>{
      const target=resolve(fileURLToPath(uri));
      assert.ok(target.startsWith(resolve(temporary)+sep));
      assert.ok(owned.includes(target));
      rmSync(target,{recursive:true,force:true});
    }};
    await purgeCaptureOwner("a",source);await purgeCaptureOwner("a",source);
    assert.ok(owned.every(path=>!existsSync(path)));
    assert.ok(preserved.every(path=>existsSync(join(path,"synthetic.enc"))));assert.ok(existsSync(sourcePhoto));
  } finally {
    f.db.close();
    assert.equal(dirname(resolve(temporary)),artifacts);
    rmSync(temporary,{recursive:true,force:true});
  }
});

test("image deletion failure retains journal references; SQL failure rolls back and remains retryable", async () => {
  const f = fixture();
  try {
    await assert.rejects(purgeCaptureOwner("a",{...f.source,removeDirectory:async()=>{throw Error("file busy");}}),/file busy/);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM capture_drafts WHERE owner_id='a'").get()?.count,1);
    f.db.exec("CREATE TRIGGER fail_erasure BEFORE DELETE ON capture_ocr_intents BEGIN SELECT RAISE(ABORT, 'disk failure'); END");
    await assert.rejects(purgeCaptureOwner("a",f.source),/disk failure/);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM capture_drafts WHERE owner_id='a'").get()?.count,1);
    f.db.exec("DROP TRIGGER fail_erasure"); await purgeCaptureOwner("a",f.source);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM capture_drafts WHERE owner_id='a'").get()?.count,0);
  } finally { f.db.close(); }
});

test("native capture writers and picker recovery share the retirement fence before account deletion", () => {
  const capture=readFileSync(new URL("./capture-storage.ts",import.meta.url),"utf8");
  const fallback=readFileSync(new URL("./fallback-storage.ts",import.meta.url),"utf8");
  const retirement=readFileSync(new URL("../../features/auth/account-local-retirement.ts",import.meta.url),"utf8");
  assert.match(capture,/createPickerRecoveryStore\(database, withLocalOwnerAccess\)/);
  assert.match(capture,/withLocalOwnerAccess\(owner,.*persistCaptureImageWithLease/);
  assert.match(capture,/withLocalOwnerAccess\(owner,.*restoreCaptureImageWithLease/);
  assert.match(fallback,/withLocalOwnerAccess\(intent.owner/);
  assert.match(retirement,/await purgeRetiredCaptureOwner\(owner\)/);
});

test("late picker begin/complete and pending reads cannot recreate a retired owner's interruption marker", async () => {
  const f = fixture(); const retired = new Set<string>();
  const access=createOwnerCacheLifecycle({isRetired:async owner=>retired.has(owner),retire:async owner=>{retired.add(owner);},resume:async owner=>{retired.delete(owner);}});
  const store=createPickerRecoveryStore(async()=>({
    execAsync:async sql=>{f.db.exec(sql);},
    runAsync:async(sql,...args)=>f.db.prepare(sql).run(...args),
    getFirstAsync:async<T>(sql:string,...args:string[]) => (f.db.prepare(sql).get(...args)??null) as T|null,
  }),access.run);
  try {
    await store.begin("a","old-picker"); await access.retire("a"); await purgeCaptureOwner("a",f.source);
    await assert.rejects(store.begin("a","late-picker"),/retired/);
    await assert.rejects(store.complete("a","old-picker"),/retired/);
    await assert.rejects(store.pending("a"),/retired/);
    await store.begin("b","other-picker"); assert.equal(await store.pending("b"),true);
    assert.equal(f.db.prepare("SELECT COUNT(*) AS count FROM capture_picker_attempts WHERE owner_id='a'").get()?.count,0);
  } finally {f.db.close();}
});
