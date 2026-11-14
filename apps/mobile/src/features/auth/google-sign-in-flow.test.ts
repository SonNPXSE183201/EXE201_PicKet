import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as policy from "./google-sign-in-policy";

function provider({ platform = "android", clientId = "web-client", unavailable = false,
  result = { type: "success", data: { idToken: "id-token" } } as unknown,
  nativeError = null as unknown, tokenError = null as Error | null, cleanupError = false } = {}) {
  const calls: string[] = [];
  const tokens: unknown[] = [];
  let inMutation = false;
  class AuthCallbackError extends Error {}
  const adapters: Record<string, unknown> = {
    "@picket/domain": {},
    react: { createContext: () => ({ Provider: "Provider" }), useCallback: (fn: unknown) => fn,
      useMemo: (fn: () => unknown) => fn(), useEffect: () => undefined,
      useRef: (value: unknown) => ({ current: value }), useState: (value: unknown) => [value, () => undefined] },
    "react/jsx-runtime": { jsx: (_type: unknown, props: unknown) => ({ props }) },
    "react-native": { Platform: { OS: platform } },
    "expo-linking": { createURL: () => "com.picket.mobile://auth/callback" },
    "expo-secure-store": {},
    "expo-web-browser": { maybeCompleteAuthSession() {},
      getCustomTabsSupportingBrowsersAsync: async () => ({ preferredBrowserPackage: "chrome" }),
      openAuthSessionAsync: async () => { calls.push("browser"); return { type: "dismiss" }; } },
    "@/core/supabase/client": { authStorageKey: "fixture", supabase: { auth: {
      signInWithIdToken: async (input: unknown) => {
        assert.equal(inMutation, true);
        calls.push("id-token"); tokens.push(input); return { error: tokenError };
      },
      signInWithOAuth: async () => { assert.equal(inMutation, true); calls.push("oauth"); return { data: { url: "https://oauth.test" }, error: null }; },
      getSession: async () => ({ data: { session: { user: { id: "fixture" } } } }),
    } } },
    "@/core/api/client": {}, "@/features/auth/phone-sign-in": {},
    "@/core/storage/secure-auth-storage": {}, "@/features/auth/session-recovery": {},
    "@/features/auth/auth-callback": { AuthCallbackError },
    "@/features/auth/google-sign-in-policy": policy,
    "@/features/auth/device-sign-out": {
      createAuthMutationQueue: () => async (action: () => unknown) => {
        inMutation = true;
        try { return await action(); } finally { inMutation = false; }
      },
      signOutDeviceSession: async () => { calls.push("device-sign-out"); },
    },
    "@react-native-google-signin/google-signin": { GoogleSignin: {
      configure: (options: object) => { assert.deepEqual({ ...options }, { webClientId: clientId }); calls.push("configure"); },
      hasPlayServices: async () => { calls.push("play-services"); if (nativeError) throw nativeError; },
      signOut: async () => { calls.push("native-sign-out"); if (cleanupError) throw new Error("cleanup failed"); },
      signIn: async () => { calls.push("native-sign-in"); return result; },
    } },
  };
  const exports = {} as { AuthProvider(props: unknown): { props: { value: { signInWithGoogle(): Promise<void>; signOut(): Promise<void> } } } };
  const compiled = ts.transpileModule(readFileSync("src/features/auth/auth-context.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, { exports, process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: clientId } },
    require: (id: string) => {
      if (unavailable && id === "@react-native-google-signin/google-signin") throw new Error("native module missing");
      assert.ok(id in adapters, id); return adapters[id];
    } });
  return { auth: exports.AuthProvider({ children: null }).props.value, calls, tokens, AuthCallbackError };
}

test("native Google configures once, opens the chooser each time and exchanges tokens in mutateAuth without nonce", async () => {
  const { auth, calls, tokens } = provider();
  await auth.signInWithGoogle();
  await auth.signInWithGoogle();
  assert.deepEqual(calls, ["configure", "play-services", "native-sign-out", "native-sign-in", "id-token",
    "play-services", "native-sign-out", "native-sign-in", "id-token"]);
  assert.deepEqual(tokens.map((input) => ({ ...input as object })), [
    { provider: "google", token: "id-token" }, { provider: "google", token: "id-token" },
  ]);
});

test("unsupported native conditions retain the Custom Tab OAuth flow", async () => {
  for (const options of [{ clientId: "" }, { platform: "ios" }, { unavailable: true },
    { nativeError: { code: "PLAY_SERVICES_NOT_AVAILABLE" } }, { nativeError: { code: 10 } },
    { result: { type: "success", data: { idToken: null } } }]) {
    const { auth, calls } = provider(options);
    await auth.signInWithGoogle();
    assert.ok(calls.includes("oauth"));
    assert.ok(calls.includes("browser"));
    assert.ok(!calls.includes("id-token"));
  }
});

test("cancel, in-progress and token exchange errors never start OAuth", async () => {
  for (const options of [{ result: { type: "cancelled", data: null } },
    { nativeError: { code: "12501" } }, { nativeError: { code: "ASYNC_OP_IN_PROGRESS" } },
    { nativeError: new Error("network") }, { tokenError: new Error("rejected token") }]) {
    const { auth, calls, AuthCallbackError } = provider(options);
    await assert.rejects(auth.signInWithGoogle, (error: unknown) => {
      if ("result" in options || (options.nativeError as { code?: string })?.code === "12501") {
        assert.ok(error instanceof AuthCallbackError);
        assert.equal(error.message, "Đăng nhập Google đã bị hủy hoặc không hoàn tất.");
      } else assert.equal(error, options.nativeError ?? options.tokenError);
      return true;
    });
    assert.ok(!calls.includes("oauth"));
  }
});

test("device sign-out also clears native Google best-effort", async () => {
  for (const options of [{}, { unavailable: true }, { cleanupError: true }]) {
    const { auth, calls } = provider(options);
    await auth.signOut();
    assert.equal(calls[0], "device-sign-out");
    if (!options.unavailable) assert.equal(calls[1], "native-sign-out");
  }
});
