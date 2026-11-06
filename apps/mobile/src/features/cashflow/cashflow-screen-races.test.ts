import { paperShape, paperSpace } from "../../core/theme/paper-foundations";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

type Element = { type: unknown; props: Record<string, unknown> };
function nodes(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Element;
  return [node, ...nodes(node.props.children)];
}
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).join("");
  return value && typeof value === "object" && "props" in value ? text((value as Element).props.children) : "";
}

test("rapid schedule save callbacks dispatch one mutation", async () => {
  const slots: unknown[] = [];
  let cursor = 0;
  let saves = 0;
  let release!: (value: unknown) => void;
  const pending = new Promise(done => { release = done; });
  const document = { revision: 1, schedules: [] };
  const state = (initial: unknown) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  };
  const ref = (initial: unknown) => {
    const index = cursor++;
    return slots[index] ?? (slots[index] = { current: initial });
  };
  const effect = (callback: () => unknown, deps: unknown[]) => {
    const index = cursor++;
    const previous = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
    if (!previous || deps.some((value, position) => !Object.is(value, previous.deps[position]))) {
      previous?.cleanup?.();
      slots[index] = { deps, cleanup: callback() };
    }
  };
  const adapters: Record<string, unknown> = {
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
    react: { useState: state, useRef: ref, useEffect: effect, useCallback: (callback: unknown) => callback },
    "react/jsx-runtime": { jsx: (type: unknown, props: unknown) => ({ type, props }), jsxs: (type: unknown, props: unknown) => ({ type, props }) },
    "react-native": { Text: "Text", View: "View", ScrollView: "ScrollView", TextInput: "TextInput" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "@/core/ui/accessible-pressable": { AccessiblePressable: "Pressable" },
    "@/features/auth/auth-context": { useAuth: () => ({ session: null, localMode: true }) },
    "@/features/settings/appearance-provider": { useAppTheme: () => ({ colors: {}, language: "en", theme: "light" }) },
    "@/features/accounts/accounts-context": { useAccounts: () => ({ accounts: [] }) },
    "react-i18next": { useTranslation: () => ({ t: (key: string) => key }) },
    "@/core/i18n/formatters": { localCalendarDay: () => "2026-10-25", formatCalendarDate: (value: string) => value, localeFor: () => "en-US" },
    "@/features/cashflow/schedule-storage": { cashflowSchedules: { load: async () => document, status: async () => ({ linked: false, pending: 0 }), subscribe: () => () => {}, save: () => { saves++; return pending; } } },
    "@/features/cashflow/scenario-form": { parseScenarioMoney: () => 100 },
    "@/core/local/guest-finance": { guestOwnerId: "guest" },
    "expo-crypto": { randomUUID: () => "schedule-id" },
    "expo-router": { router: { back: () => {} }, Redirect: "Redirect" },
  };
  const exports: { Scenario?: (props: { owner: string }) => unknown } = {};
  const source = readFileSync("src/app/cashflow-preview.tsx", "utf8") + "\nexports.Scenario=Scenario;";
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: (key: string) => adapters[key] ?? {}, Date, AbortController,
  });
  const render = () => { cursor = 0; return exports.Scenario!({ owner: "guest" }); };
  render();
  for (let index = 0; index < 3; index++) await new Promise(done => setImmediate(done));
  const save = nodes(render()).find(node => node.type === "Pressable" && text(node.props.children) === "save");
  assert.ok(save);
  const press = save.props.onPress as () => void;
  press();
  press();
  assert.equal(saves, 1);
  release(document);
  for (let index = 0; index < 3; index++) await new Promise(done => setImmediate(done));
  const retry = nodes(render()).find(node => node.type === "Pressable" && text(node.props.children) === "save");
  assert.ok(retry);
  (retry.props.onPress as () => void)();
  assert.equal(saves, 2);
});
