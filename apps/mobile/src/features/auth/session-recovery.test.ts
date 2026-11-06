import assert from "node:assert/strict";
import test from "node:test";
import { AuthApiError, AuthRetryableFetchError, GoTrueClient, type Session } from "@supabase/supabase-js";
import { recoverDeviceSession } from "./session-recovery";

const saved = { access_token: "qa-access", refresh_token: "qa-refresh", token_type: "bearer", expires_at: 1, user: { id: "owner-a" } } as Session;
const offline = new AuthRetryableFetchError("offline", 0);
function deps(patch: Record<string, unknown> = {}) {
  return {
    getSession: async () => ({ data: { session: null as Session | null }, error: offline as unknown }),
    readPersisted: async () => JSON.stringify(saved),
    isCurrent: () => true,
    ...patch,
  };
}

test("a stalled SDK refresh cannot block offline cache access indefinitely", { timeout: 200 }, async () => {
  assert.deepEqual(await recoverDeviceSession(deps({ getSession: () => new Promise(() => {}) }), 5), saved);
});

test("restores the securely persisted device owner after retryable refresh failure", async () => {
  assert.deepEqual(await recoverDeviceSession(deps()), saved);
});

test("fresh SDK session wins without reading an older persisted owner", async () => {
  const fresh = { ...saved, user: { ...saved.user, id: "owner-b" } };
  assert.equal(await recoverDeviceSession(deps({ getSession: async () => ({ data: { session: fresh }, error: null }), readPersisted: async () => { throw new Error("must not read"); } })), fresh);
});

test("does not resurrect storage after authoritative rejection or signed-out response", async () => {
  for (const error of [new AuthApiError("invalid refresh", 400, "refresh_token_not_found"), new Error("unexpected"), null]) {
    let reads = 0;
    assert.equal(await recoverDeviceSession(deps({ getSession: async () => ({ data: { session: null }, error }), readPersisted: async () => { reads++; return JSON.stringify(saved); } })), null);
    assert.equal(reads, 0);
  }
});

test("missing, malformed or incomplete persisted session fails closed", async () => {
  for (const value of [null, "{bad", "null", "[]", "{}", JSON.stringify({ ...saved, user: null }), JSON.stringify({ ...saved, access_token: "" }), JSON.stringify({ ...saved, refresh_token: "" }), JSON.stringify({ ...saved, token_type: "other" }), JSON.stringify({ ...saved, expires_at: null })]) {
    assert.equal(await recoverDeviceSession(deps({ readPersisted: async () => value })), null);
  }
});

test("a sign-out or owner switch while storage is loading cancels recovery", async () => {
  let active = true;
  const result = await recoverDeviceSession(deps({ isCurrent: () => active, readPersisted: async () => { active = false; return JSON.stringify(saved); } }));
  assert.equal(result, null);
});

test("a newer auth event while getSession runs prevents stale bootstrap", async () => {
  let active = true;
  let reads = 0;
  assert.equal(await recoverDeviceSession(deps({ isCurrent: () => active, getSession: async () => { active = false; return { data: { session: saved }, error: null }; }, readPersisted: async () => { reads++; return JSON.stringify(saved); } })), null);
  assert.equal(reads, 0);
});

test("storage failure and unexpected SDK rejection do not leave bootstrap rejected", async () => {
  assert.equal(await recoverDeviceSession(deps({ readPersisted: async () => { throw new Error("keystore unavailable"); } })), null);
  assert.equal(await recoverDeviceSession(deps({ getSession: async () => { throw new Error("unexpected SDK error"); } })), null);
});

test("thrown retryable fetch errors follow the same guarded recovery path", async () => {
  assert.deepEqual(await recoverDeviceSession(deps({ getSession: async () => { throw offline; } })), saved);
});

test("installed Auth SDK keeps expired storage but returns null offline; recovery retains the owner", async (t) => {
  const key = "qa-offline-recovery-test";
  const values = new Map([[key, JSON.stringify(saved)]]);
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const auth = new GoTrueClient({
    url: "https://offline.invalid/auth/v1", storageKey: key,
    autoRefreshToken: true, persistSession: true, detectSessionInUrl: false,
    storage: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, value: string) => { values.set(k, value); }, removeItem: (k: string) => { values.delete(k); } },
    fetch: async () => {
      // Advance only the test clock to skip the SDK's retry backoff budget.
      now += 31_000;
      throw new TypeError("network unavailable");
    },
  });
  try {
    const result = await auth.getSession();
    assert.equal(result.data.session, null);
    assert.equal(result.error?.name, "AuthRetryableFetchError");
    assert.ok(values.get(key));
    const recovered = await recoverDeviceSession({ getSession: () => auth.getSession(), readPersisted: async () => values.get(key) ?? null, isCurrent: () => true });
    assert.equal(recovered?.user.id, saved.user.id);
  } finally {
    await auth.stopAutoRefresh();
  }
});
