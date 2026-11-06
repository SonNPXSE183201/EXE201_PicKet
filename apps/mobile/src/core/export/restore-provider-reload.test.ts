import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

/** Execute real provider refresh code with hook/storage/transport adapters, without native rendering. */
test("every finance provider propagates strict reload failures, keeps ordinary refresh usable, and rejects missing sessions", async () => {
  for (const [part, name] of [
    ["profile", "Profile"], ["accounts", "Accounts"], ["transactions", "Transactions"],
    ["budgets", "Budgets"], ["bills", "Bills"], ["subscriptions", "Subscriptions"],
  ]) {
    const failure = Error(`Synthetic ${part} reload failure`); let online = false, signedIn = true, writes = 0;
    const hooks = {
      createContext: () => ({ Provider: "provider" }), useEffect: () => {},
      useState: (value: unknown) => [value, () => { writes++; }], useCallback: (value: unknown) => value,
      useMemo: (factory: () => unknown) => factory(),
    };
    const api = new Proxy({}, { get: () => async () => {
      if (!online) throw failure;
      return { profile: { onboardingCompleted: true }, accounts: [], categories: [], transactions: [], budgets: [], bills: [], subscriptions: [] };
    } });
    const adapters: Record<string, unknown> = {
      react: hooks, "react/jsx-runtime": { jsx: (_type: unknown, props: unknown) => ({ props }) },
      "@/core/api/client": { picketApi: api },
      "@/core/api/api-error-message": { reportApiError: () => {}, apiErrorMessage: () => "Controlled error" },
      "@/features/auth/auth-context": { useAuth: () => ({ session: signedIn ? { user: { id: "synthetic-owner" }, access_token: "synthetic" } : null, localMode: false }) },
      "@/features/profile/profile-context": { useProfile: () => ({ profile: { onboardingCompleted: true } }) },
      "@/core/local/guest-finance-context": { useGuestFinance: () => ({ data: {} }) },
      "@/core/sync/use-cached-state": { useCachedState: (_owner: unknown, _resource: unknown, value: unknown) => [value, () => { writes++; }] },
      "@/core/sync/load-all-transactions": { loadAllTransactions: (load: (options: object) => Promise<unknown>) => load({}) },
    };
    const module = { exports: {} as Record<string, (props: object) => { props: { value: { refresh(options?: { throwOnError?: boolean }): Promise<void> } } }> };
    const source = readFileSync(`src/features/${part}/${part}-context.tsx`, "utf8");
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(compiled, { exports: module.exports, require: (id: string) => adapters[id] ?? {}, console });
    let refresh = module.exports[`${name}Provider`]({ children: null }).props.value.refresh;
    await refresh();
    await assert.rejects(refresh({ throwOnError: true }), error => error === failure);
    online = true; const before = writes; await refresh({ throwOnError: true }); assert.ok(writes > before);
    signedIn = false; refresh = module.exports[`${name}Provider`]({ children: null }).props.value.refresh;
    await refresh(); await assert.rejects(refresh({ throwOnError: true }), /unavailable/);
  }
});
