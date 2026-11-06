import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createAppI18n } from "../../core/i18n/instance";
import { formatInstant, formatMoney } from "../../core/i18n/formatters";
import { buildTransactionMerge, parseEditedConflictPayload, transactionMergeFields } from "../../core/sync/conflict-resolution";

type Element = { type: unknown; props: Record<string, unknown>; key?: unknown };
const nodes = (v: unknown): Element[] => Array.isArray(v) ? v.flatMap(nodes) : v && typeof v === "object" && "props" in v ? [v as Element, ...nodes((v as Element).props.children)] : [];
const text = (v: unknown): string => typeof v === "string" ? v : Array.isArray(v) ? v.map(text).join("") : v && typeof v === "object" && "props" in v ? text((v as Element).props.children) : "";
const settle = async () => { for (let i = 0; i < 5; i++) await new Promise(done => setImmediate(done)); };
const conflict = { id: "conflict-a", userId: "owner-a", kind: "account.update", entityKey: "account:source-A", payload: { id: "entity-a", request: { expectedVersion: 1, name: "Local account" } }, reason: "UPSTREAM_SECRET_SENTINEL", failedAt: "2026-10-27T00:00:00Z" };
const deferred = () => { let resolve!: (value?: unknown) => void; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness(merge = false) {
  let slots: unknown[] = [], cursor = 0, stopped = false, updatesAfterStop = 0;
  let owner = "owner-a", subscriber = () => {}, removed = 0, queued = 0, notified = 0;
  let rootKey: unknown;
  let session = { user: { id: owner }, access_token: "synthetic-token" };
  let rows = [{ ...conflict }];
  let read = async () => rows;
  let remove = async () => {};
  let retry = async () => {};
  let confirm: (() => void) | undefined;
  const i18n = createAppI18n("en");
  const state = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], (value: unknown) => { if (stopped) updatesAfterStop++; slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  };
  const ref = (initial: unknown) => { const index = cursor++; return slots[index] ?? (slots[index] = { current: initial }); };
  const effect = (callback: () => unknown, deps: unknown[]) => {
    const index = cursor++, old = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
    if (!old || deps.some((v, i) => !Object.is(v, old.deps[i]))) { old?.cleanup?.(); slots[index] = { deps, cleanup: callback() }; }
  };
  const cleanup = () => { for (const slot of slots) (slot as {cleanup?: () => void})?.cleanup?.(); };
  const styles = new Proxy({}, { get: (_t, key) => key });
  const transaction = { id: "entity-a", version: 2, deletedAt: null, title: "Server title", amount: 12000, accountId: "wallet-a", categoryId: null, occurredAt: "2026-10-26T12:00:00Z", note: "" };
  const mergeConflict = { ...conflict, kind: "transaction.update", payload: { id: "entity-a", request: { expectedVersion: 1, title: "Local title" } } };
  const adapters: Record<string, unknown> = {
    "react": { useState: state, useRef: ref, useEffect: effect, useLayoutEffect: effect, useCallback: (fn: unknown, deps: unknown[]) => {
      const index = cursor++, old = slots[index] as { deps: unknown[]; value: unknown } | undefined;
      if (!old || deps.some((v, i) => !Object.is(v, old.deps[i]))) slots[index] = { deps, value: fn };
      return (slots[index] as { value: unknown }).value;
    } },
    "react/jsx-runtime": { jsx: (type: unknown, props: Record<string, unknown>, key: unknown) => ({ type, props, key }), jsxs: (type: unknown, props: Record<string, unknown>, key: unknown) => ({ type, props, key }) },
    "react-native": { View: "View", ActivityIndicator: "ActivityIndicator", StyleSheet: { create: (v: unknown) => v }, Alert: { alert: (_title: string, _body: string, buttons: {onPress?: () => void}[]) => { confirm = buttons.at(-1)?.onPress; } } },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-router": { Redirect: "Redirect", router: { replace: () => {} } },
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/ui/picket-text-input": { PicketTextInput: "TextInput" },
    "@/core/ui/accessible-pressable": { AccessiblePressable: "Pressable" },
    "@/core/ui/picket-ui": { ChoiceChip: "ChoiceChip", PrimaryAction: "PrimaryAction" },
    "@/core/theme/paper-foundations": { paperShape: {}, paperSpace: {} },
    "@/core/theme/use-mobile-styles": { useMobileStyles: () => ({ colors: styles, styles }) },
    "@/features/settings/appearance-provider": { useAppTheme: () => ({ colors: styles, language: i18n.language }) },
    "react-i18next": { useTranslation: () => ({ t: (key: string, values: object = {}) => i18n.t(key, { ns: "conflicts", ...values }) }) },
    "@/features/auth/auth-context": { useAuth: () => ({ session }) },
    "@/features/accounts/accounts-context": { useAccounts: () => ({ accounts: [{ id: "wallet-a", name: "Wallet", currencyCode: "VND" }] }) },
    "@/features/transactions/transactions-context": { useTransactions: () => ({ categories: [] }) },
    "@/core/navigation/routes": { routes: { home: "/", login: "/login" } },
    "@/core/api/client": { picketApi: {} },
    "@/core/sync/load-all-transactions": { loadAllTransactions: async () => [transaction] },
    "@/core/i18n/formatters": { formatInstant, formatMoney },
    "@/core/sync/conflict-resolution": { buildTransactionMerge, parseEditedConflictPayload, transactionMergeFields },
    "@/core/sync/mutation-queue": {
      listMutationConflicts: () => read(),
      subscribeToMutationQueue: (fn: () => void) => { subscriber = fn; return () => { subscriber = () => {}; }; },
      removeMutationConflict: async () => { removed++; await remove(); rows = []; },
      retryMutationConflict: async () => { queued++; await retry(); rows = []; },
    },
    "@/features/sync/transaction-merge-editor": { TransactionMergeEditor: "MergeEditor" },
  };
  const exports: {default?: () => Element; TransactionMergeEditor?: (props: object) => Element} = {};
  const file = merge ? "src/features/sync/transaction-merge-editor.tsx" : "src/app/sync-conflicts.tsx";
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (id: string) => {
      if (id === "@/features/sync/conflict-screen") {
        const child = {};
        vm.runInNewContext(ts.transpileModule(readFileSync("src/features/sync/conflict-screen.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: child, require: (key: string) => adapters[key] ?? {}, AbortController, Intl, Date });
        return child;
      }
      return adapters[id] ?? {};
    }, AbortController, Intl, Date });
  const render = (): Element => {
    cursor = 0;
    let value = merge ? exports.TransactionMergeEditor!({ conflict: mergeConflict, onQueued: () => { notified++; } }) : exports.default!();
    if (!value) return { type: "Empty", props: {} };
    while (typeof value.type === "function") {
      if (rootKey !== undefined && rootKey !== value.key) { cleanup(); slots = []; cursor = 0; }
      rootKey = value.key;
      value = (value.type as (props: object) => Element)(value.props);
    }
    return value;
  };
  const press = (...labels: string[]) => {
    const button = nodes(render()).find(node => (node.type === "Pressable" || node.type === "PrimaryAction" || node.type === "ChoiceChip") && labels.includes(String(node.props.label ?? text(node.props.children))));
    assert.ok(button, "Missing button: " + labels.join(" / "));
    return button.props.onPress as () => void;
  };
  render();
  return {
    render, press, view: () => text(render()), i18n,
    stop: () => { cleanup(); stopped = true; },
    changeOwner: () => { owner = "owner-b"; session = { user: { id: owner }, access_token: "other-synthetic-token" }; render(); },
    removed: () => removed, queued: () => queued, notified: () => notified, lateUpdates: () => updatesAfterStop,
    setRemove: (fn: () => Promise<void>) => { remove = fn; }, setRetry: (fn: () => Promise<void>) => { retry = fn; },
    setRead: (fn: () => Promise<typeof rows>) => { read = fn; }, signal: () => subscriber(), initialRows: () => [{ ...conflict }],
    confirm: () => { assert.ok(confirm); return confirm; },
  };
}
const dismissLabels = ["Đã xem, giữ bản trên máy chủ", "Keep server version"];
const editLabels = ["Sửa và gửi lại", "Edit and retry"];
const retryLabels = ["Đưa vào hàng đợi đồng bộ", "Queue changes"];
const submitLabels = ["Gửi bản đã chọn", "Send selected changes"];
const localLabels = ["Tên giao dịch: dùng bản trên máy", "Transaction title: use device version"];

test("conflict dismiss serializes rapid taps before the next render", async () => {
  const app = harness(); await settle(); const hold = deferred(); app.setRemove(() => hold.promise.then(() => {}));
  const press = app.press(...dismissLabels); press(); press(); assert.equal(app.removed(), 1); hold.resolve(); await settle(); app.stop();
});
test("captured conflict actions do not dispatch after unmount or owner replacement", async () => {
  const app = harness(); await settle(); const old = app.press(...dismissLabels); app.changeOwner(); old();
  assert.equal(app.removed(), 0); assert.ok(!app.view().includes("account:source-A")); app.stop();
});
test("a stale conflict read cannot resurrect a successfully dismissed row", async () => {
  const app = harness(); await settle(); const hold = deferred(); const old = app.initialRows(); app.setRead(() => hold.promise.then(() => old)); app.signal(); app.setRead(async () => []);
  app.press(...dismissLabels)(); await settle(); hold.resolve(); await settle();
  assert.ok(!app.view().includes("account:source-A")); app.stop();
});
test("retry storage failures keep the conflict and use a controlled retry message", async () => {
  const app = harness(); await settle(); app.press(...editLabels)(); app.setRetry(async () => { throw Error("PRIVATE_SQLITE_ERROR"); });
  app.press(...retryLabels)(); await settle(); assert.ok(app.view().includes("Changes could not be queued")); assert.ok(app.view().includes("account:source-A")); app.stop();
});
test("conflict copy switches language without exposing raw upstream reasons", async () => {
  const app = harness(); await settle(); assert.ok(app.view().includes("Sync conflicts")); assert.ok(!app.view().includes("UPSTREAM_SECRET_SENTINEL"));
  await app.i18n.changeLanguage("vi"); assert.ok(app.view().includes("Xung đột đồng bộ")); app.stop();
});
test("in-flight dismiss completion cannot update an unmounted conflict screen", async () => {
  const app = harness(); await settle(); const hold = deferred(); app.setRemove(() => hold.promise.then(() => {})); app.press(...dismissLabels)(); app.stop(); hold.resolve(); await settle(); assert.equal(app.lateUpdates(), 0);
});
test("the merge confirmation dispatches only once when tapped twice", async () => {
  const app = harness(true); await settle(); app.press(...localLabels)(); const hold = deferred(); app.setRetry(() => hold.promise.then(() => {}));
  app.press(...submitLabels)(); const confirm = app.confirm(); confirm(); confirm(); assert.equal(app.queued(), 1); hold.resolve(); await settle(); app.stop();
});
test("a merge confirmation captured before unmount cannot queue changes", async () => {
  const app = harness(true); await settle(); app.press(...localLabels)(); app.press(...submitLabels)(); const confirm = app.confirm(); app.stop(); confirm(); assert.equal(app.queued(), 0);
});
test("an already-dispatched merge does not notify a retired parent", async () => {
  const app = harness(true); await settle(); app.press(...localLabels)(); const hold = deferred(); app.setRetry(() => hold.promise.then(() => {})); app.press(...submitLabels)(); app.confirm()(); app.stop(); hold.resolve(); await settle(); assert.equal(app.notified(), 0); assert.equal(app.lateUpdates(), 0);
});
test("a merge confirmation cannot dispatch after the authenticated owner changes", async () => {
  const app = harness(true); await settle(); app.press(...localLabels)(); app.press(...submitLabels)(); const confirm = app.confirm(); app.changeOwner(); confirm(); assert.equal(app.queued(), 0); app.stop();
});

test("a dismissed-conflict storage failure is handled without losing the pending row", async () => {
  const app = harness(); await settle(); app.setRemove(async () => { throw Error("PRIVATE_DISK_ERROR"); });
  app.press(...dismissLabels)(); await settle();
  assert.ok(app.view().includes("could not be saved")); assert.ok(app.view().includes("account:source-A")); assert.ok(!app.view().includes("PRIVATE_DISK_ERROR")); app.stop();
});
test("a changed field selection invalidates an already-open merge confirmation", async () => {
  const app = harness(true); await settle(); app.press(...localLabels)(); app.press(...submitLabels)(); const old = app.confirm();
  app.press("Transaction title: keep server version")(); app.render(); old();
  assert.equal(app.queued(), 0); assert.ok(app.view().includes("comparison has changed")); app.stop();
});
test("controlled conflict failure messages rerender in the newly selected language", async () => {
  const app = harness(); await settle(); app.press(...editLabels)(); app.setRetry(async () => { throw Error("PRIVATE_FAILURE"); });
  app.press(...retryLabels)(); await settle(); assert.ok(app.view().includes("Changes could not be queued"));
  await app.i18n.changeLanguage("vi"); assert.ok(app.view().includes("Chưa đưa thay đổi vào hàng đợi")); app.stop();
});
