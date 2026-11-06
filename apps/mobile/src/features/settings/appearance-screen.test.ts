import { paperShape, paperSpace } from "../../core/theme/paper-foundations";
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { colorSchemes } from "../../core/theme/color-schemes";

type Element = { type: unknown; props: Record<string, any> };
function harness(fail = false) {
  const states: unknown[] = [], refs: { current: any }[] = [];
  let stateIndex = 0, refIndex = 0;
  const updates: object[] = [];
  const appearance = { colors: colorSchemes.nomad.light, theme: "light", themeMode: "system", language: "vi", colorSchemeId: "ocean", ready: true, error: false, saving: false, retry() {}, update: async (patch: object) => { updates.push(patch); if (fail) throw Error("disk"); } };
  const jsx = (type: unknown, props: Record<string, any>) => ({ type, props });
  const module = { exports: {} as { AppearanceScreen(): Element } };
  const adapters: Record<string, unknown> = {
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
    react: { useState: (initial: unknown) => { const i = stateIndex++; if (!(i in states)) states[i] = initial; return [states[i], (v: unknown) => { states[i] = v; }]; }, useRef: (initial: unknown) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }), useEffect: () => {} },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "react-native": { View: "View", Text: "Text", ActivityIndicator: "Spinner", StyleSheet: { create: (s: unknown) => s } },
    "@/core/ui/accessible-pressable": { AccessiblePressable: "Pressable" },
    "@/core/ui/app-icon": { AppIcon: "Icon" },
    "@/core/ui/picket-ui": { PicketScreen: "Screen", TopAppBar: "Header" },
    "@/core/theme/color-schemes": { colorSchemes, colorSchemeIds: Object.keys(colorSchemes) },
    "./appearance-provider": { useAppTheme: () => appearance, useThemedStyles: (fn: (c: unknown) => unknown) => fn(appearance.colors) },
    "@/core/i18n/formatters": { formatMoney: (amount: number) => String(amount) },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("./appearance-screen.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, { exports: module.exports, require: (id: string) => { assert.ok(id in adapters, `Unexpected runtime dependency: ${id}`); return adapters[id]; } });
  function render() { stateIndex = 0; refIndex = 0; return module.exports.AppearanceScreen(); }
  return { appearance, updates, render };
}
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const el = node as Element;
  return [el, ...elements(el.props.children)];
}
test("production appearance uses resolved account palette, labels and accessible selection", () => {
  const h = harness(), nodes = elements(h.render());
  const ocean = nodes.find(n => n.props.accessibilityLabel === "Ocean")!;
  assert.equal(ocean.props.accessibilityState.checked, true);
  assert.equal(nodes.find(n => n.props.accessibilityLabel === "Nomad")!.props.accessibilityState.checked, false);
  assert.equal(nodes.find(n => n.props.accessibilityLabel === "Theo hệ thống")!.props.accessibilityState.checked, true);
});
test("changing color or display mode writes only appearance and prevents overlapping selections", async () => {
  const h = harness(), nodes = elements(h.render());
  const nomad = nodes.find(n => n.props.accessibilityLabel === "Nomad")!;
  nomad.props.onPress(); nomad.props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.updates.length, 1);
  assert.equal(JSON.stringify(h.updates[0]), '{"colorSchemeId":"nomad"}');
  const dark = elements(h.render()).find(n => n.props.accessibilityLabel === "Tối")!;
  dark.props.onPress(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(JSON.stringify(h.updates[1]), '{"themeMode":"dark"}');
});
test("failed persistence exposes a retry message and keeps prior theme selected", async () => {
  const h = harness(true);
  elements(h.render()).find(n => n.props.accessibilityLabel === "Nomad")!.props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  const nodes = elements(h.render());
  assert.ok(nodes.some(n => n.props.accessibilityRole === "alert" && String(n.props.children).includes("Chưa lưu được")));
  assert.equal(nodes.find(n => n.props.accessibilityLabel === "Ocean")!.props.accessibilityState.checked, true);
});
test("storage errors and pending writes disable all theme controls", () => {
  const h = harness();
  for (const field of ["saving", "error"] as const) {
    h.appearance[field] = true;
    const radios = elements(h.render()).filter(n => n.props.accessibilityRole === "radio");
    assert.equal(radios.length, 7);
    assert.ok(radios.every(n => n.props.disabled && n.props.accessibilityState.disabled));
    h.appearance[field] = false;
  }
});
