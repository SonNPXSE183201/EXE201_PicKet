import { paperShape, paperSpace } from "../../core/theme/paper-foundations";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createAppI18n } from "../../core/i18n/instance";
import { formatMoney, localeFor, normalizeLanguage } from "../../core/i18n/formatters";
import { parsePaymentAmount } from "../../core/forms/payment-form";

type Element = { type: unknown; props: Record<string, unknown> };
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function plan(month: string, limit = 1000) { return { method: "simple", periods: [{ budgetId: "food", month, limit, carriedAmount: 0 }, { budgetId: "travel", month, limit, carriedAmount: 0 }], close: null }; }

/** Execute real callbacks with deterministic hooks/transport, without native rendering. */
function harness() {
  const i18n = createAppI18n("en"); const slots: unknown[] = []; let cursor = 0;
  const state = { transfers: 0, closes: 0, methods: 0, reads: 0, owner: "owner-A", retired: false };
  let session = { user: { id: "owner-A" }, access_token: "synthetic-A" };
  let getPlanning = async (_token: string, month: string) => plan(month);
  let transfer = async () => {};
  let fenceWait: Promise<void> = Promise.resolve();
  let confirm: (() => void) | undefined;
  let history: unknown[] = [], allocations: unknown[] = [];
  let budgets = [{ id: "food", name: "Food", defaultLimit: 1000 }, { id: "travel", name: "Travel", defaultLimit: 1000 }];
  const useState = (initial: unknown) => {
    const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  };
  const useRef = (initial: unknown) => { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; };
  const effect = (callback: () => void | (() => void), deps: unknown[]) => {
    const index = cursor++, previous = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
    if (!previous || deps.some((value, part) => !Object.is(value, previous.deps[part]))) {
      previous?.cleanup?.(); slots[index] = { deps, cleanup: callback() };
    }
  };
  const style = new Proxy({}, { get: (_target, key) => String(key) });
  const adapters: Record<string, unknown> = {
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
    react: { useState, useRef, useEffect: effect, useLayoutEffect: effect },
    "react/jsx-runtime": { jsx: (type: unknown, props: object) => ({ type, props }), jsxs: (type: unknown, props: object) => ({ type, props }) },
    "react-i18next": { useTranslation: () => ({ i18n, t: (key: string, values: object) => i18n.t(key, { ...values, ns: "planning" }) }) },
    "react-native": { StyleSheet: { create: (value: unknown) => value }, Alert: { alert: (_title: string, _description: string, buttons: { onPress?: () => void }[]) => { confirm = buttons[1].onPress; } } },
    "@/core/theme/use-mobile-styles": { useMobileStyles: () => ({ colors: style, styles: style }) },
    "@/core/i18n/formatters": { formatMoney, localeFor, normalizeLanguage },
    "@/core/forms/payment-form": { parsePaymentAmount },
    "@/core/sync/offline-cache": { withLocalOwnerAccess: async (owner: string, operation: () => Promise<unknown>) => {
      assert.equal(owner, session.user.id); await fenceWait; if (state.retired) throw Error("Retired owner"); return operation();
    } },
    "@/features/auth/auth-context": { useAuth: () => ({ session, localMode: false }) },
    "@/core/local/guest-finance-context": { useGuestFinance: () => ({ data: {}, loading: false }) },
    "@/features/budgets/budgets-context": { useBudgets: () => ({ budgets, update: async () => {} }) },
    "@/features/transactions/use-transaction-history": { useTransactionHistory: () => ({ transactions: history, loading: false, error: null }) },
    "@/features/transactions/use-spending-splits": { useSpendingSplits: () => ({ splits: allocations, loading: false, error: null }) },
    "@/core/local/budget-overview": { budgetOverview: () => ({ spent: 0 }) },
    "@/core/api/client": { picketApi: {
      getPlanning: (token: string, month: string) => { state.reads++; return getPlanning(token, month); },
      transferBudgetLimit: async () => { state.transfers++; await transfer(); },
      closeBudgetMonth: async () => { state.closes++; }, setBudgetMethod: async () => { state.methods++; },
    } },
    "@/core/ui/picket-text-input": { PicketTextInput: "TextInput" },
    "@/core/ui/accessible-pressable": { AccessiblePressable: "Pressable" },
    "@/core/ui/picket-ui": { PicketScreen: "Screen", ChoiceChip: "ChoiceChip", PrimaryAction: "PrimaryAction" },
  };
  const module = { exports: {} as { default(): Element } };
  const compiled = ts.transpileModule(readFileSync("src/app/planning.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports: module.exports, require: (id: string) => adapters[id] ?? {}, Date });
  function render() { cursor = 0; return module.exports.default(); }
  function find(type: string, label: string) {
    const node = elements(render()).find(element => element.type === type && (element.props.label === label || element.props.accessibilityLabel === label));
    assert.ok(node, `Missing ${type}: ${label}`); return node;
  }
  function selectTransfer() {
    const source = elements(render()).find(element => element.type === "ChoiceChip" && String(element.props.label).startsWith("Food ·"));
    assert.ok(source); (source.props.onPress as () => void)();
    (find("ChoiceChip", "Travel").props.onPress as () => void)();
    (find("TextInput", "Limit transfer amount").props.onChangeText as (value: string) => void)("100");
  }
  return { state, render, find, selectTransfer,
    setGet: (value: typeof getPlanning) => { getPlanning = value; }, setTransfer: (value: typeof transfer) => { transfer = value; },
    setFenceWait: (value: Promise<void>) => { fenceWait = value; },
    refreshFacts: (kind: "history" | "allocations" | "budgets") => { if (kind === "history") history = [...history]; if (kind === "allocations") allocations = [...allocations]; if (kind === "budgets") budgets = [...budgets]; },
    switchSession: (owner: string) => { state.owner = owner; session = { user: { id: owner }, access_token: `synthetic-${owner}` }; },
    confirmClose: () => { assert.ok(confirm); confirm(); },
  };
}
async function settle() { for (let index = 0; index < 8; index++) await new Promise(resolve => setImmediate(resolve)); }

test("planning serializes rapid transfers and disables both month arrows until the request settles", async () => {
  const app = harness(); app.render(); await settle(); app.selectTransfer();
  const held = deferred<void>(); app.setTransfer(() => held.promise);
  const callback = app.find("PrimaryAction", "Transfer limit").props.onPress as () => void;
  callback(); callback();
  const nextDisabled = app.find("Pressable", "Next month").props.disabled;
  const previousDisabled = app.find("Pressable", "Previous month").props.disabled;
  held.resolve(); await settle();
  assert.equal(app.state.transfers, 1); assert.equal(nextDisabled, true); assert.equal(previousDisabled, true);
});

test("a stale planning read cannot overwrite a newer mutation result", async () => {
  const app = harness(); app.render(); await settle(); app.selectTransfer();
  const old = deferred<ReturnType<typeof plan>>(); let month = "";
  app.setGet(async (_token, selectedMonth) => { month = selectedMonth; return old.promise; });
  app.switchSession("owner-A"); app.render(); await settle();
  app.setGet(async (_token, selectedMonth) => plan(selectedMonth, 900));
  (app.find("PrimaryAction", "Transfer limit").props.onPress as () => void)(); await settle();
  old.resolve(plan(month, 500)); await settle();
  const labels = elements(app.render()).filter(node => node.type === "ChoiceChip").map(node => node.props.label);
  assert.ok(labels.includes(`Food · ${formatMoney(900, "en", "VND")}`));
});

test("month-close alert cannot submit for an owner that has since changed", async () => {
  const app = harness(); app.render(); await settle();
  (app.find("Pressable", "Previous month").props.onPress as () => void)(); app.render(); await settle();
  const checked = elements(app.render()).find(node => node.props.accessibilityLabel === "Reviewed categories, possible duplicates and account reconciliation");
  assert.ok(checked); (checked.props.onValueChange as (value: boolean) => void)(true);
  (app.find("PrimaryAction", "Close month").props.onPress as () => void)();
  app.switchSession("owner-B"); app.render(); app.confirmClose(); await settle();
  assert.equal(app.state.closes, 0);
});

test("month-close rechecks the latest review checkbox when the native confirmation returns", async () => {
  const app = harness(); app.render(); await settle();
  (app.find("Pressable", "Previous month").props.onPress as () => void)(); app.render(); await settle();
  const checked = elements(app.render()).find(node => node.props.accessibilityLabel === "Reviewed categories, possible duplicates and account reconciliation");
  assert.ok(checked); (checked.props.onValueChange as (value: boolean) => void)(true);
  (app.find("PrimaryAction", "Close month").props.onPress as () => void)();
  (checked.props.onValueChange as (value: boolean) => void)(false); app.render();
  app.confirmClose(); await settle(); assert.equal(app.state.closes, 0);
});

test("a previously captured next-month callback cannot bypass a running transfer", async () => {
  const app = harness(); app.render(); await settle(); app.selectTransfer();
  const next = app.find("Pressable", "Next month").props.onPress as () => void;
  const held = deferred<void>(); app.setTransfer(() => held.promise);
  (app.find("PrimaryAction", "Transfer limit").props.onPress as () => void)();
  const reads = app.state.reads;
  next(); app.render(); assert.equal(app.state.reads, reads);
  held.resolve(); await settle(); assert.equal(app.state.transfers, 1);
  assert.equal(app.find("Pressable", "Next month").props.disabled, false);
});

test("planning write dispatch shares the owner retirement fence for transfers, methods and month close", async () => {
  for (const action of ["transfer", "method", "close"]) {
    const app = harness(); app.render(); await settle();
    if (action === "transfer") app.selectTransfer();
    if (action === "close") {
      (app.find("Pressable", "Previous month").props.onPress as () => void)(); app.render(); await settle();
      const checked = elements(app.render()).find(node => node.props.accessibilityLabel === "Reviewed categories, possible duplicates and account reconciliation");
      assert.ok(checked); (checked.props.onValueChange as (value: boolean) => void)(true);
    }
    app.state.retired = true;
    if (action === "transfer") (app.find("PrimaryAction", "Transfer limit").props.onPress as () => void)();
    if (action === "method") (app.find("ChoiceChip", "Envelope").props.onPress as () => void)();
    if (action === "close") { (app.find("PrimaryAction", "Close month").props.onPress as () => void)(); app.confirmClose(); }
    await settle();
    assert.equal(app.state.transfers + app.state.methods + app.state.closes, 0, action);
  }
});

test("an owner change while a planning write waits for its lease prevents transport dispatch", async () => {
  const app = harness(); app.render(); await settle(); app.selectTransfer();
  const held = deferred<void>(); app.setFenceWait(held.promise);
  (app.find("PrimaryAction", "Transfer limit").props.onPress as () => void)();
  app.switchSession("owner-B"); app.render();
  held.resolve(); await settle(); assert.equal(app.state.transfers, 0);
});

test("reloading ledger, allocation or budget facts invalidates the prior month-close review", async () => {
  for (const kind of ["history", "allocations", "budgets"] as const) {
    const app = harness(); app.render(); await settle();
    (app.find("Pressable", "Previous month").props.onPress as () => void)(); app.render(); await settle();
    const checked = elements(app.render()).find(node => node.props.accessibilityLabel === "Reviewed categories, possible duplicates and account reconciliation");
    assert.ok(checked); (checked.props.onValueChange as (value: boolean) => void)(true);
    (app.find("PrimaryAction", "Close month").props.onPress as () => void)();
    app.refreshFacts(kind); app.render(); app.confirmClose(); await settle();
    assert.equal(app.state.closes, 0, kind);
    assert.equal(app.find("PrimaryAction", "Close month").props.disabled, true);
  }
});

test("a refreshed review needs a fresh confirmation instead of reusing an older native dialog", async () => {
  const app = harness(); app.render(); await settle();
  (app.find("Pressable", "Previous month").props.onPress as () => void)(); app.render(); await settle();
  const checked = () => { const node = elements(app.render()).find(row => row.props.accessibilityLabel === "Reviewed categories, possible duplicates and account reconciliation"); assert.ok(node); return node; };
  (checked().props.onValueChange as (value: boolean) => void)(true);
  (app.find("PrimaryAction", "Close month").props.onPress as () => void)();
  app.refreshFacts("history"); app.render(); (checked().props.onValueChange as (value: boolean) => void)(true);
  app.render(); app.confirmClose(); await settle(); assert.equal(app.state.closes, 0);
  assert.equal(app.find("PrimaryAction", "Close month").props.disabled, false);
  (app.find("PrimaryAction", "Close month").props.onPress as () => void)(); app.confirmClose(); await settle();
  assert.equal(app.state.closes, 1);
});
