import { paperShape, paperSpace } from "../theme/paper-foundations";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createAppI18n } from "../i18n/instance";
import { backupValidationMessage, createRestoreRunner, refreshRestoredProviders } from "./restore-attempt";

type Element = { type: unknown; props: Record<string, unknown> };
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}
function text(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(text).join("");
  return node && typeof node === "object" && "props" in node ? text((node as Element).props.children) : "";
}

/** Actual screen callbacks with deterministic hooks, picker, filesystem and transport adapters. */
function harness() {
  const i18n = createAppI18n("en");
  const slots: unknown[] = []; let cursor = 0;
  const state = { owner: "owner-A", commits: 0, reads: 0, navigations: 0, commitFails: false, reloadFails: false, reloads: 0 };
  const file = { canceled: false, assets: [{ name: "Synthetic.json", uri: "file:///synthetic.json", size: 10 }] };
  let picker = async () => file;
  const useState = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  };
  const useRef = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  };
  const style = new Proxy({}, { get: (_target, key) => String(key) });
  const reload = async (options?: { throwOnError?: boolean }) => { assert.equal(options?.throwOnError, true); state.reloads++; if (state.reloadFails) throw Error("Synthetic reload failure"); };
  const adapters: Record<string, unknown> = {
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
    react: { useState, useRef, useEffect: () => {}, useLayoutEffect: (effect: () => void) => effect() },
    "react/jsx-runtime": { jsx: (type: unknown, props: object) => ({ type, props }), jsxs: (type: unknown, props: object) => ({ type, props }) },
    "react-i18next": { useTranslation: () => ({ t: (key: string, values: object) => i18n.t(key, { ...values, ns: "restore" }) }) },
    "react-native": { StyleSheet: { create: (value: unknown) => value } },
    "@/core/theme/use-mobile-styles": { useMobileStyles: () => ({ colors: style, styles: style }) },
    "@/features/auth/auth-context": { useAuth: () => ({ session: { user: { id: state.owner }, access_token: "synthetic" }, localMode: false }) },
    "@/core/local/guest-finance-context": { useGuestFinance: () => ({}) },
    "@/core/ui/picket-text-input": { PicketTextInput: "TextInput" },
    "@/core/ui/accessible-pressable": { AccessiblePressable: "Pressable" },
    "@/core/navigation/routes": { routes: { home: "/", login: "/login" } },
    "expo-router": { router: { replace: () => { state.navigations++; }, back: () => {} } },
    "expo-document-picker": { getDocumentAsync: () => picker() },
    "expo-file-system/legacy": { EncodingType: { UTF8: "utf8" }, readAsStringAsync: async () => { state.reads++; return JSON.stringify({ format: "picket-export-v1" }); } },
    "@/core/export/restore-attempt": { createRestoreRunner, backupValidationMessage, refreshRestoredProviders },
    "@/core/sync/offline-cache": { withLocalOwnerAccess: async (_owner: string, operation: () => Promise<unknown>) => operation() },
    "@/core/api/client": { picketApi: {
      validateFinanceImport: async () => ({ valid: true, wallets: 0, entries: 0, budgets: 0, bills: 0, keepsakes: 0, subscriptions: 0 }),
      loadFinanceSnapshot: async () => ({ revision: 1 }),
      restoreFinance: async () => { state.commits++; if (state.commitFails) throw Error("Synthetic lost response"); return { restored: true, revision: 2 }; },
    } },
  };
  for (const [part, hook] of [["profile", "useProfile"], ["accounts", "useAccounts"], ["transactions", "useTransactions"], ["budgets", "useBudgets"], ["bills", "useBills"], ["subscriptions", "useSubscriptions"]]) {
    adapters[`@/features/${part}/${part}-context`] = { [hook]: () => ({ refresh: reload }) };
  }
  const module = { exports: {} as { default(): Element } };
  const source = readFileSync("src/app/restore.tsx", "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports: module.exports, require: (id: string) => adapters[id] ?? {}, TextEncoder, Error });
  function render() { cursor = 0; return module.exports.default(); }
  function press(label: string) {
    const button = elements(render()).find(element => element.type === "Pressable" && text(element.props.children) === label);
    assert.ok(button, `Missing button: ${label}`); assert.notEqual(button.props.disabled, true);
    (button.props.onPress as () => void)();
  }
  function confirm() {
    const input = elements(render()).find(element => element.props.accessibilityLabel === "Confirm backup restoration");
    assert.ok(input); (input.props.onChangeText as (value: string) => void)("RESTORE");
  }
  return { state, render, press, confirm, setPicker: (value: typeof picker) => { picker = value; } };
}

async function settle() { for (let index = 0; index < 8; index++) await new Promise(resolve => setImmediate(resolve)); }

test("screen cancels file selection without locking the next preparation and ignores a stale owner picker result", async () => {
  const app = harness();
  app.setPicker(async () => ({ canceled: true, assets: [] }));
  app.press("Choose JSON or .picket file"); await settle();
  let release!: (value: { canceled: boolean; assets: { name: string; uri: string; size: number }[] }) => void;
  app.setPicker(() => new Promise(resolve => { release = resolve; }));
  app.press("Choose JSON or .picket file");
  app.state.owner = "owner-B"; app.render();
  release({ canceled: false, assets: [{ name: "Synthetic.json", uri: "file:///synthetic.json", size: 10 }] });
  await settle(); assert.equal(app.state.reads, 0); assert.equal(app.state.commits, 0);
});

test("screen removes ambiguous restore submission and does not navigate or silently resubmit", async () => {
  const app = harness();
  app.press("Choose JSON or .picket file"); await settle(); app.confirm();
  app.state.commitFails = true;
  app.press("Restore data"); await settle();
  assert.equal(app.state.commits, 1); assert.equal(app.state.navigations, 0);
  assert.match(text(app.render()), /result is unconfirmed/);
  assert.equal(elements(app.render()).some(element => element.type === "Pressable" && text(element.props.children) === "Restore data"), false);
});

test("screen retries only provider reload after a confirmed import and waits before navigating", async () => {
  const app = harness();
  app.press("Choose JSON or .picket file"); await settle(); app.confirm();
  app.state.reloadFails = true; app.press("Restore data"); await settle();
  assert.equal(app.state.commits, 1); assert.equal(app.state.navigations, 0); assert.equal(app.state.reloads, 6);
  app.state.reloadFails = false; app.press("Reload restored data"); await settle();
  assert.equal(app.state.commits, 1); assert.equal(app.state.navigations, 1); assert.equal(app.state.reloads, 12);
});
