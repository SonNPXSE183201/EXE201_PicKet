import { dockVisibleOn } from "./navigation-layout";
import { paperShape, paperSpace } from "../theme/paper-foundations";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { paperLight, paperDark } from "../theme/themes";
import { mobileThemeColors } from "../theme/mobile-theme-adapter";

type Element = { type: string; props: Record<string, any> };
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element;
  return [element, ...elements(element.props.children)];
}
function harness(mode: "light" | "dark", path = "/", pendingCapture = false) {
  const calls: string[] = [];
  const colors = mobileThemeColors(mode === "light" ? paperLight : paperDark);
  const jsx = (type: string, props: Record<string, any>) => ({ type, props });
  const module = { exports: {} as { NavigationShell(): Element } };
  const adapters: Record<string, unknown> = {
    "./navigation-layout": { dockVisibleOn },
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { useEffect() {}, useRef: (value: unknown) => ({ current: value }), useState: (value: unknown) => [value, () => {}] },
    "react-native": { Keyboard: {}, StyleSheet: { create: (value: unknown) => value }, Text: "Text", View: "View" },
    "expo-router": { usePathname: () => path, router: { navigate: (route: string) => calls.push(route) } },
    "react-native-safe-area-context": { useSafeAreaInsets: () => ({ bottom: 24 }) },
    "@/features/settings/appearance-provider": { useAppTheme: () => ({ language: "vi" }) },
    "@/features/profile/profile-context": { useProfile: () => ({ profile: { displayName: "Nguyễn Bảo" } }) },
    "@/core/theme/use-mobile-styles": { useMobileStyles: (factory: (c: typeof colors) => unknown) => ({ colors, styles: factory(colors) }) },
    "@/features/auth/auth-context": { useAuth: () => ({ localMode: true, session: null }) },
    "@/core/ocr/capture-storage": { captureJournal: { load: async () => pendingCapture ? { id: "unfinished" } : null } },
    "@/core/local/guest-finance": { guestOwnerId: "guest" },
    "./accessible-pressable": { AccessiblePressable: "Pressable" },
    "./app-icon": { AppIcon: "Icon" },
  };
  const compiled = ts.transpileModule(readFileSync(new URL("./navigation-shell.tsx", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  runInNewContext(compiled, { exports: module.exports, require: (id: string) => { assert.ok(id in adapters, id); return adapters[id]; } });
  return { nodes: elements(module.exports.NavigationShell()), calls };
}

test("Paper navigation exposes five destinations and opens capture as an action in both modes", async () => {
  for (const mode of ["light", "dark"] as const) {
    const { nodes, calls } = harness(mode);
    const controls = nodes.filter(n => n.type === "Pressable");
    assert.deepEqual(controls.map(n => n.props.accessibilityLabel), ["Nhà", "Chi tiêu", "Chụp", "Dự định", "Bảo"]);
    assert.equal(controls[0].props.accessibilityState.selected, true);
    const camera = controls[2];
    assert.equal(camera.props.accessibilityRole, "button");
    assert.equal(camera.props.accessibilityState, undefined);
    assert.ok(elements(camera).some(n => n.type === "Icon" && n.props.color === "#FFFFFF"));
    await camera.props.onPress();
    assert.deepEqual(calls, ["/capture"]);
    // Only the rounded active tile represents selection; no extra dot element.
    const activeViews = elements(controls[0]).filter(n => n.type === "View");
    assert.equal(activeViews.length, 1);
    assert.ok(activeViews[0].props.children);
    assert.equal(nodes[0].props.style[1].bottom, 24);
  }
});

test("Budget screen belongs to Plans while detail forms do not display the dock", () => {
  const plans = harness("dark", "/budgets").nodes.find(n => n.props.accessibilityLabel === "Dự định")!;
  assert.equal(plans.props.accessibilityState.selected, true);
  assert.equal(harness("light", "/transactions/new").nodes.length, 0);
});

test("Spending always opens history even with an unfinished capture", async () => {
  const {nodes,calls}=harness("light", "/", true);
  await nodes.find(n=>n.props.accessibilityLabel==="Chi tiêu")!.props.onPress();
  assert.deepEqual(calls,["/transactions"]);
});
