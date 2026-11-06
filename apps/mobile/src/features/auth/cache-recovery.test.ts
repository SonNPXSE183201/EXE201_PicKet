import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { verifyCacheRecoveryOwner } from "./cache-recovery";
import { createAppI18n } from "../../core/i18n/instance";

test("cache recovery asks the installed SDK for the server user with the captured token", async () => {
  let calls = 0;
  const client = createClient("https://synthetic.invalid", "synthetic-publishable", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      calls++;
      assert.equal(String(input), "https://synthetic.invalid/auth/v1/user");
      assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer synthetic-access");
      return Response.json({ id: "owner-a", aud: "authenticated", created_at: "2026-10-25T00:00:00Z", app_metadata: {}, user_metadata: {} });
    } },
  });
  assert.equal(await verifyCacheRecoveryOwner(client.auth, "synthetic-access"), "owner-a");
  assert.equal(calls, 1);
});

test("deleted or unavailable server accounts never recover from a locally cached identity", async () => {
  const client = createClient("https://synthetic.invalid", "synthetic-publishable", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async () => Response.json({ msg: "User from sub claim does not exist", code: "user_not_found" }, { status: 401 }) },
  });
  await assert.rejects(verifyCacheRecoveryOwner(client.auth, "deleted-access"), /verification/);
  await assert.rejects(verifyCacheRecoveryOwner({ getUser: async () => { throw Error("offline"); } }, "access"), /offline/);
  await assert.rejects(verifyCacheRecoveryOwner({ getUser: async () => ({ data: { user: null }, error: null }) }, "access"), /verification/);
});

test("the owner recovery boundary gates data providers and defers navigation readiness until providers mount", async () => {
  const boundary = readFileSync(resolve(process.cwd(), "src/features/auth/owner-cache-boundary.tsx"), "utf8");
  const layout = readFileSync(resolve(process.cwd(), "src/app/_layout.tsx"), "utf8");
  assert.match(boundary, /key=\{session.user.id\}/);
  assert.match(boundary, /isOfflineCacheOwnerRetired/);
  assert.match(boundary, /verifyCacheRecoveryOwner/);
  assert.match(boundary, /recoverOfflineCacheOwner/);
  assert.match(boundary, /await refreshDeviceLock\(\)/);
  assert.doesNotMatch(boundary, /resumeOfflineCacheOwner|getSession\(|getClaims\(/);
  assert.match(layout, /<OwnerCacheBoundary><ReadySessionProviders>/);
  assert.match(layout, /function ReadySessionProviders/);
  const readyTree = layout.slice(layout.indexOf("function SessionReadyTree"));
  assert.doesNotMatch(readyTree, /bootstrapIntentGate.ready/);
  for (const language of ["vi", "en"] as const) {
    const copy = createAppI18n(language);
    for (const key of ["recoveryTitle", "recoveryDescription", "deletedTitle", "verifyAccount", "verifyFailed", "finishSignOut", "checkingAccount"]) {
      const value = copy.t(key, { ns: "accountDeletion" });
      assert.notEqual(value, key);
      assert.ok(value.length > 0);
    }
  }
});
