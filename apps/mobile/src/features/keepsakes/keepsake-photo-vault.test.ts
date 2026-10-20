import assert from "node:assert/strict";
import test from "node:test";
import { gcm } from "@noble/ciphers/aes.js";
import { fromByteArray, toByteArray } from "base64-js";
import { createPhotoVault, selectPhotoOrphans, createPhotoLeaseGate } from "./keepsake-photo-vault";

test("cleanup skips active backup/save and blocks new operations until release", async () => {
  const gate = createPhotoLeaseGate();
  let release!: () => void;
  const saving = gate.use("A", () => new Promise<void>(resolve => { release = resolve; }));
  await Promise.resolve();
  assert.equal(await gate.clean("A", async () => true), null);
  release(); await saving;
  const events: string[] = [];
  const cleaning = gate.clean("A", async () => { events.push("clean"); await new Promise<void>(resolve => { release = resolve; }); events.push("cleaned"); });
  await Promise.resolve();
  const next = gate.use("A", async () => { events.push("save"); });
  await Promise.resolve(); assert.deepEqual(events, ["clean"]);
  release(); await cleaning; await next;
  assert.deepEqual(events, ["clean", "cleaned", "save"]);
  await assert.rejects(gate.use("A", async () => { throw new Error("failure"); }));
  assert.equal(await gate.clean("A", async () => true), true);
});

test("photo vault stores only sealed bytes and binds reads to owner", async () => {
  const files = new Map<string, string>();
  const vault = createPhotoVault({
    write: async (uri, text) => { files.set(uri, text); },
    read: async uri => files.get(uri)!,
    seal: async (value, owner) => `enc-v1:${owner}:${JSON.stringify(value)}`,
    open: async (value, owner) => { assert.ok(value.startsWith(`enc-v1:${owner}:`)); return JSON.parse(value.slice(`enc-v1:${owner}:`.length)); },
  });
  await vault.write("A", "A/new.enc", { mime: "image/png", base64: "iVBORw==" });
  assert.ok(files.get("A/new.enc")!.startsWith("enc-v1:"));
  assert.deepEqual(await vault.read("A", "A/new.enc"), { mime: "image/png", base64: "iVBORw==" });
  await assert.rejects(vault.read("B", "A/new.enc"));
  files.set("A/bad.enc", "{}");
  await assert.rejects(vault.read("A", "A/bad.enc"));
});

test("vault rejects invalid media before writing", async () => {
  let writes = 0;
  const vault = createPhotoVault({ write: async () => { writes++; }, read: async () => "", seal: async () => "enc-v1:x", open: async () => ({}) });
  for (const value of [{ mime: "text/html", base64: "eA==" }, { mime: "image/png", base64: "!" }, { mime: "image/png", base64: "" }]) {
    await assert.rejects(vault.write("A", "A/new.enc", value));
  }
  assert.equal(writes, 0);
});

test("AES-GCM ciphertext hides image bytes and rejects tampering or another owner", async () => {
  const files = new Map<string, string>();
  const key = new Uint8Array(32).fill(7), nonce = new Uint8Array(12).fill(3);
  const encoder = new TextEncoder();
  const vault = createPhotoVault({
    write: async (uri, text) => { files.set(uri, text); }, read: async uri => files.get(uri)!,
    seal: async (photo, owner) => "enc-v1:" + fromByteArray(gcm(key, nonce, encoder.encode(owner)).encrypt(encoder.encode(JSON.stringify(photo)))),
    open: async (text, owner) => JSON.parse(new TextDecoder().decode(gcm(key, nonce, encoder.encode(owner)).decrypt(toByteArray(text.slice(7))))),
  });
  const photo = { mime: "image/png", base64: "iVBORw0KGgpQUklWQVRF" };
  await vault.write("A", "photo.enc", photo);
  assert.ok(!files.get("photo.enc")!.includes(photo.base64));
  assert.deepEqual(await vault.read("A", "photo.enc"), photo);
  await assert.rejects(vault.read("B", "photo.enc"));
  const text = files.get("photo.enc")!;
  files.set("photo.enc", text.slice(0, 12) + (text[12] === "A" ? "B" : "A") + text.slice(13));
  await assert.rejects(vault.read("A", "photo.enc"));
});

test("orphan selection fails closed and preserves referenced, young, foreign and oversized files", () => {
  const now = 200_000_000;
  const files = ["old.enc", "pending.enc", "cached.jpg", "young.enc", "../other.enc", "huge.enc"].map(name => ({ uri: `file:///keepsakes/A/${name}`, size: name === "huge.enc" ? 30_000_000 : 100, modifiedAt: name === "young.enc" ? now : 1 }));
  const prefix = "file:///keepsakes/A/";
  assert.deepEqual(selectPhotoOrphans(files, [prefix], null, now), []);
  assert.deepEqual(selectPhotoOrphans(files, [prefix], new Set([prefix + "pending.enc", prefix + "cached.jpg"]), now).map(f => f.uri), [prefix + "old.enc"]);
  const many = Array.from({ length: 30 }, (_, i) => ({ uri: prefix + i + ".enc", size: 1_000_000, modifiedAt: 1 }));
  assert.equal(selectPhotoOrphans(many, [prefix], new Set(), now).length, 20);
});
