import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createAuthFetch } from "./auth-fetch";

test("auth can use a dedicated native transport without rerouting storage", async () => {
  const calls: string[] = [];
  const shared: typeof fetch = async () => { calls.push("shared"); throw new TypeError("Shared transport unavailable"); };
  const dedicated: typeof fetch = async (_input, init) => {
    calls.push("auth");
    assert.equal(init?.body, "credentials");
    return new Response('{"accepted":true}', { headers: { "content-type": "application/json" } });
  };
  const fetcher = createAuthFetch(shared, "https://project.supabase.co/auth/v1", 100, dedicated);
  assert.deepEqual(await (await fetcher("https://project.supabase.co/auth/v1/token", { method: "POST", body: "credentials" })).json(), { accepted: true });
  await assert.rejects(fetcher("https://project.supabase.co/storage/v1/object"), /Shared transport unavailable/);
  assert.deepEqual(calls, ["auth", "shared"]);
});

test("dedicated auth failures are not replayed on the shared transport", async () => {
  let sharedCalls = 0;
  const shared: typeof fetch = async () => { sharedCalls++; return new Response(); };
  const dedicated: typeof fetch = async () => { throw new TypeError("Auth transport unavailable"); };
  const fetcher = createAuthFetch(shared, "https://project.supabase.co/auth/v1", 100, dedicated);
  await assert.rejects(fetcher("https://project.supabase.co/auth/v1/token"), /Auth transport unavailable/);
  assert.equal(sharedCalls, 0);
});

test("stalled auth request is aborted and rejects even if transport ignores abort", async () => {
  let signal: AbortSignal | null = null;
  const fetcher = createAuthFetch(async (_input, init) => {
    signal = init?.signal ?? null;
    return new Promise<Response>(() => undefined);
  }, "https://project.supabase.co/auth/v1", 10);
  await assert.rejects(fetcher("https://project.supabase.co/auth/v1/logout"), { name: "AbortError" });
  assert.equal(signal!.aborted, true);
});

test("caller cancellation and existing request fields are preserved", async () => {
  const controller = new AbortController();
  const fetcher = createAuthFetch(async (_input, init) => {
    assert.equal(init?.method, "POST");
    assert.equal(init?.body, "payload");
    assert.equal((init?.headers as Record<string, string>).apikey, "public-key");
    return new Promise<Response>(() => undefined);
  }, "https://project.supabase.co/auth/v1", 1000);
  const pending = fetcher("https://project.supabase.co/auth/v1/token", {
    method: "POST", body: "payload", headers: { apikey: "public-key" }, signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("auth JSON body stalls are bounded after response headers arrive", async () => {
  const body = new ReadableStream<Uint8Array>({ start() { /* Intentionally never closes. */ } });
  const fetcher = createAuthFetch(async () => new Response(body), "https://project.supabase.co/auth/v1", 10);
  await assert.rejects(fetcher("https://project.supabase.co/auth/v1/token"), { name: "AbortError" });
});

test("already-aborted Request signals prevent transport from starting", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const fetcher = createAuthFetch(async () => { calls++; return new Response(); }, "https://project.supabase.co/auth/v1", 10);
  await assert.rejects(fetcher(new Request("https://project.supabase.co/auth/v1/token", { signal: controller.signal })), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("Request-input cancellation during transport and empty logout responses are supported", async () => {
  const controller = new AbortController();
  const fetcher = createAuthFetch(async () => new Promise<Response>(() => undefined), "https://project.supabase.co/auth/v1", 1000);
  const pending = fetcher(new Request("https://project.supabase.co/auth/v1/token", { signal: controller.signal }));
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  const empty = new Response(null, { status: 204 });
  assert.equal(await createAuthFetch(async () => empty, "https://project.supabase.co/auth/v1", 10)("https://project.supabase.co/auth/v1/logout"), empty);
});

test("a different origin with an auth-like path is not wrapped", async () => {
  const controller = new AbortController();
  const response = new Response('unrelated');
  const fetcher = createAuthFetch(async (_input, init) => { assert.equal(init?.signal, controller.signal); return response; }, "https://project.supabase.co/auth/v1", 10);
  assert.equal(await fetcher("https://other.example/auth/v1/token", { signal: controller.signal }), response);
});

test("successful responses pass through and non-auth requests keep their original signal", async () => {
  const response = new Response('{"ok":true}');
  const controller = new AbortController();
  const fetcher = createAuthFetch(async (input, init) => {
    if (String(input).includes('/storage/')) assert.equal(init?.signal, controller.signal);
    return response;
  }, "https://project.supabase.co/auth/v1", 10);
  assert.deepEqual(await (await fetcher("https://project.supabase.co/auth/v1/token")).json(), { ok: true });
  assert.equal(await fetcher("https://project.supabase.co/storage/v1/object", { signal: controller.signal }), response);
});

test("installed SDK removes a fresh local session on a stalled logout without deleting app data", async () => {
  const storage = new Map<string, string>([['app-queue', 'retained-owner-work']]);
  storage.set('qa-session', JSON.stringify({
    access_token: 'qa-jwt', refresh_token: 'qa-refresh', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600,
    user: { id: 'qa-owner', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-20T00:00:00Z' },
  }));
  const client = createClient('https://project.supabase.co', 'public-key', {
    auth: { storageKey: 'qa-session', autoRefreshToken: false, detectSessionInUrl: false, storage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storage.set(key, value); },
      removeItem: key => { storage.delete(key); },
    } },
    global: { fetch: createAuthFetch(async input => {
      if (String(input).includes('/logout')) return new Promise<Response>(() => undefined);
      return new Response(JSON.stringify({ access_token: 'qa-b-jwt', refresh_token: 'qa-b-refresh', token_type: 'bearer', expires_in: 3600,
        user: { id: 'qa-owner-b', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-20T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }, "https://project.supabase.co/auth/v1", 10) },
  });
  assert.equal((await client.auth.getSession()).data.session?.user.id, 'qa-owner');
  const events: string[] = [];
  const { data } = client.auth.onAuthStateChange(event => { events.push(event); });
  try {
    const result = await client.auth.signOut({ scope: 'local' });
    assert.ok(result.error, 'Network revocation still reports its transport error');
    assert.equal((await client.auth.getSession()).data.session, null);
    assert.equal(storage.has('qa-session'), false);
    assert.equal(storage.get('app-queue'), 'retained-owner-work');
    assert.ok(events.includes('SIGNED_OUT'));
    const next = await client.auth.signInWithPassword({ email: 'qa-b@example.com', password: 'generated-qa-only' });
    assert.equal(next.error, null);
    assert.equal(next.data.session?.user.id, 'qa-owner-b');
    assert.equal((await client.auth.getSession()).data.session?.user.id, 'qa-owner-b');
  } finally { data.subscription.unsubscribe(); }
});
