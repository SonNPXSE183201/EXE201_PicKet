import assert from "node:assert/strict";
import test from "node:test";
import { AuthApiError, AuthRetryableFetchError, createClient, processLock } from "@supabase/supabase-js";
import { createAuthMutationQueue, signOutDeviceSession } from "./device-sign-out";

test("a stale A logout queued behind B sign-in cannot call SDK logout or erase B",async()=>{
 const storageKey="qa-stale-owner-logout";
 const records=new Map<string,string>();let logoutRequests=0;
 const storage={getItem:async(key:string)=>records.get(key)??null,setItem:async(key:string,value:string)=>{records.set(key,value);},removeItem:async(key:string)=>{records.delete(key);}};
 const client=createClient("https://project.supabase.co","public-key",{
  auth:{storageKey,storage,lock:processLock,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:async input=>{
   if(String(input).includes("/logout")){logoutRequests++;return new Response(null,{status:204});}
   return Response.json({access_token:"synthetic-b",refresh_token:"synthetic-b-refresh",token_type:"bearer",expires_in:3600,user:{id:"owner-B",aud:"authenticated",created_at:"2026-10-25T00:00:00Z",app_metadata:{},user_metadata:{}}});
  }},
 });
 const run=createAuthMutationQueue();
 const signin=run(()=>client.auth.signInWithPassword({email:"synthetic-b@example.test",password:"synthetic-only"}));
 const stale=run(()=>signOutDeviceSession({auth:client.auth,storageKey,storage,expectedOwner:"owner-A"}));
 const rejected=assert.rejects(stale,/owner|session/);
 assert.equal((await signin).data.user?.id,"owner-B");await rejected;
 assert.equal(logoutRequests,0);assert.equal((await client.auth.getSession()).data.session?.user.id,"owner-B");
});

test("owner-bound logout rejects unreadable/foreign records but can finish its own or already-cleared session",async()=>{
 let record:string|null="not-json",calls=0;
 const source={expectedOwner:"A",storageKey:"qa-owned-logout",storage:{getItem:async()=>record,removeItem:async()=>{record=null;}},auth:{signOut:async()=>{calls++;record=null;return {error:null};}}};
 for(const value of ["not-json",JSON.stringify({user:{id:"B"}}),JSON.stringify({access_token:"no-user"})]){
  record=value;await assert.rejects(signOutDeviceSession(source),/owner/);
 }
 assert.equal(calls,0);record=JSON.stringify({user:{id:"A"}});await signOutDeviceSession(source);
 assert.equal(record,null);await signOutDeviceSession(source);assert.equal(calls,2);
});

test("expired offline logout clears only the auth record, emits SIGNED_OUT and permits B", async () => {
  const storageKey = "qa-expired-offline-session";
  const records = new Map<string, string>([["owner-A-queue", "retained"], [storageKey, JSON.stringify({
    access_token: "synthetic-a", refresh_token: "synthetic-refresh-a", token_type: "bearer",
    expires_at: Math.floor(Date.now() / 1000) - 3600,
    user: { id: "owner-A", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-20T00:00:00Z" },
  })]]);
  const storage = {
    async getItem(key: string) { return records.get(key) ?? null; },
    async setItem(key: string, value: string) { records.set(key, value); },
    async removeItem(key: string) { records.delete(key); },
  };
  let online = false;
  const client = createClient("https://project.supabase.co", "public-key", {
    auth: { storageKey, storage, lock: processLock, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async () => {
      if (!online) throw new TypeError("Synthetic offline transport");
      return new Response(JSON.stringify({ access_token: "synthetic-b", refresh_token: "synthetic-refresh-b", token_type: "bearer", expires_in: 3600,
        user: { id: "owner-B", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-20T00:00:00Z" } }), { headers: { "content-type": "application/json" } });
    } },
  });
  const events: string[] = [];
  const subscription = client.auth.onAuthStateChange(event => { events.push(event); });
  try {
    await signOutDeviceSession({ auth: client.auth, storageKey, storage });
    assert.equal(records.has(storageKey), false);
    assert.equal((await client.auth.getSession()).data.session, null);
    assert.ok(events.includes("SIGNED_OUT"));
    assert.equal(records.get("owner-A-queue"), "retained");
    online = true;
    const next = await client.auth.signInWithPassword({ email: "synthetic-b@example.com", password: "synthetic-only" });
    assert.equal(next.error, null);
    assert.equal((await client.auth.getSession()).data.session?.user.id, "owner-B");
  } finally { subscription.data.subscription.unsubscribe(); }
});

test("auth mutation queue fences account changes and recovers after a failed operation", async () => {
  const run = createAuthMutationQueue();
  const events: string[] = [];
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const first = run(async () => { events.push("A-start"); await held; events.push("A-end"); throw new Error("expected"); });
  const failed = assert.rejects(first, /expected/);
  const second = run(async () => { events.push("B"); return 2; });
  await Promise.resolve();
  assert.deepEqual(events, ["A-start"]);
  release(); await failed;
  assert.equal(await second, 2);
  assert.deepEqual(events, ["A-start", "A-end", "B"]);
});

test("offline cleanup refuses a replaced session and propagates secure-storage failure", async () => {
  let record: string | null = "owner-A";
  const offline = new AuthRetryableFetchError("offline", 0);
  let removals = 0;
  const storage = { async getItem() { return record; }, async removeItem() { removals++; throw new Error("secure delete failed"); } };
  const source = { storageKey: "replacement-fixture", storage, auth: { async signOut() { record = "owner-B"; return { error: offline }; } } };
  await assert.rejects(signOutDeviceSession(source), error => error === offline);
  assert.equal(record, "owner-B");
  assert.equal(removals, 0);
  source.auth.signOut = async () => ({ error: offline });
  await assert.rejects(signOutDeviceSession(source), /secure delete failed/);
  assert.equal(record, "owner-B");
});

test("non-transport auth errors never trigger storage removal", async () => {
  const denied = new AuthApiError("synthetic denial", 400, "validation_failed");
  let removed = false;
  await assert.rejects(signOutDeviceSession({
    auth: { async signOut() { return { error: denied }; } }, storageKey: "denied-fixture",
    storage: { async getItem() { return "retained"; }, async removeItem() { removed = true; } },
  }), error => error === denied);
  assert.equal(removed, false);
});

test("installed SDK lock drains a held A refresh before logout and queued B signin", async () => {
  const storageKey = "qa-held-refresh-session";
  const user = (id: string) => ({ id, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-20T00:00:00Z" });
  const session = (id: string) => ({ access_token: `synthetic-${id}`, refresh_token: `refresh-${id}`, token_type: "bearer", expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user: user(id) });
  const records = new Map([[storageKey, JSON.stringify(session("A"))], ["A-images", "retained"]]);
  const storage = { async getItem(key: string) { return records.get(key) ?? null; },
    async setItem(key: string, value: string) { records.set(key, value); }, async removeItem(key: string) { records.delete(key); } };
  let started!: () => void, release!: () => void;
  const refreshing = new Promise<void>(resolve => { started = resolve; });
  const held = new Promise<void>(resolve => { release = resolve; });
  const client = createClient("https://project.supabase.co", "public-key", {
    auth: { storageKey, storage, lock: processLock, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async input => {
      if (String(input).includes("grant_type=refresh_token")) { started(); await held; return new Response(JSON.stringify(session("A"))); }
      if (String(input).includes("/logout")) return new Response(null, { status: 204 });
      return new Response(JSON.stringify(session("B")));
    } },
  });
  await client.auth.getSession();
  const refresh = client.auth.refreshSession(); await refreshing;
  const run = createAuthMutationQueue();
  const logout = run(() => signOutDeviceSession({ auth: client.auth, storageKey, storage }));
  const signin = run(() => client.auth.signInWithPassword({ email: "synthetic-b@example.com", password: "synthetic" }));
  release(); await refresh; await logout;
  assert.equal((await signin).data.user?.id, "B");
  assert.equal((await client.auth.getSession()).data.session?.user.id, "B");
  assert.equal(records.get("A-images"), "retained");
});
