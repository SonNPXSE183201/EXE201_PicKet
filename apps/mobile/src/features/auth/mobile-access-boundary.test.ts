import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Element = { type: unknown; props: Record<string, any> };
const child = { type: "SessionNavigator", props: {} };
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return value?.props ? [value, ...nodes(value.props.children)] : [];
}
function harness() {
  const slots: any[] = [];
  let cursor = 0, owner = "owner-a", token = "token-a", signOuts = 0;
  let foreground: (state: string) => void = () => {};
  let read: () => Promise<unknown> = async () => ({ staff: false, mobileAllowed: true });
  const state = (initial: any) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value: any) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  };
  const effect = (callback: () => any, deps: any[]) => {
    const index = cursor++;
    if (!slots[index] || deps.some((dep, i) => dep !== slots[index].deps[i])) {
      slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: callback() };
    }
  };
  const modules: Record<string, any> = {
    react: { useState: state, useEffect: effect, useRef: (value: any) => { const i = cursor++; return slots[i] ??= { current: value }; } },
    "react/jsx-runtime": { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) },
    "react-native": { View: "View", Linking: {}, AppState: { addEventListener: (_event: string, callback: typeof foreground) => { foreground = callback; return { remove() {} }; } } },
    "expo-secure-store": { getItemAsync: async () => null, setItemAsync: async () => {}, deleteItemAsync: async () => {} },
    "react-i18next": { useTranslation: () => ({ t: (key: string) => key }) },
    "@picket/api-client": { ApiError: Error },
    "@/core/api/client": { picketApi: { accountAccess: () => read() } },
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/accessible-pressable": { AccessiblePressable: "Button" },
    "@/features/settings/appearance-provider": { useAppTheme: () => ({ colors: {} }) },
    "./auth-context": { useAuth: () => ({ session: { user: { id: owner }, access_token: token }, signOut: async () => { signOuts++; } }) },
    "./mobile-access-policy": { mobileAccessAllowed: (value: any) => value.mobileAllowed === true, cachedMobileAccessAllowed: () => false },
  };
  const module = { exports: {} as any };
  vm.runInNewContext(ts.transpileModule(readFileSync("src/features/auth/mobile-access-boundary.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports, Date, JSON,
    require: (name: string) => { assert.ok(modules[name], name); return modules[name]; },
  });
  function render() { cursor = 0; return module.exports.MobileAccessBoundary({ children: child }); }
  return {
    render,
    mounted: () => nodes(render()).includes(child),
    hidden: () => nodes(render()).some((node) => node.props.style?.display === "none" && nodes(node).includes(child)),
    foreground: () => foreground("active"),
    setRead: (callback: typeof read) => { read = callback; },
    refreshToken: () => { token = "token-b"; },
    switchOwner: () => { owner = "owner-b"; token = "token-b"; },
    signOuts: () => signOuts,
  };
}

test("initial access is checked before mounting the session navigator", async () => {
  const app = harness(); assert.equal(app.mounted(), false); await settle();
  assert.equal(app.mounted(), true);
});
test("foreground verification preserves the mounted route and hides it until verified", async () => {
  const app = harness(); app.render(); await settle(); assert.equal(app.mounted(), true);
  let release!: (value: unknown) => void;
  app.setRead(() => new Promise((resolve) => { release = resolve; }));
  app.foreground(); app.render();
  assert.equal(app.mounted(), true, "Do not reset the native navigation stack on resume");
  assert.equal(app.hidden(), true);
  release({ staff: true, mobileAllowed: true }); await settle();
  assert.equal(app.mounted(), true); assert.equal(app.hidden(), false);
});
test("token refresh preserves the same owner navigator while checking the new token", async () => {
  const app = harness(); app.render(); await settle();
  app.setRead(() => new Promise(() => {})); app.refreshToken(); app.render();
  assert.equal(app.mounted(), true); assert.equal(app.hidden(), true);
});
test("switching owners never mounts the new owner data before verification", async () => {
  const app = harness(); app.render(); await settle();
  app.setRead(() => new Promise(() => {})); app.switchOwner(); app.render();
  assert.equal(app.mounted(), false);
});
test("revoked mobile access removes protected content and signs out", async () => {
  const app = harness(); app.render(); await settle();
  app.setRead(async () => ({ staff: false, mobileAllowed: false }));
  app.foreground(); app.render(); await settle();
  assert.equal(app.mounted(), false); assert.equal(app.signOuts(), 1);
});
test("failed foreground verification keeps protected content inaccessible", async () => {
  const app = harness(); app.render(); await settle();
  app.setRead(async () => { throw new Error("Unavailable"); });
  app.foreground(); app.render(); await settle();
  assert.equal(app.hidden(), true);
});
