import { paperShape, paperSpace } from "../theme/paper-foundations";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createAppI18n } from "../i18n/instance";

test("shared primary actions retain their label and translate busy accessibility feedback", async () => {
  const i18n = createAppI18n("vi");
  const styles = new Proxy({}, { get: (_target, key) => String(key) });
  type Element = { props: { disabled?: boolean; accessibilityState?: { disabled?: boolean; busy?: boolean; checked?: boolean }; accessibilityLabel?: string; children: (Element | string)[] } };
  const module = { exports: {} as Record<string, (props: object) => Element> };
  const source = readFileSync(new URL("./picket-ui.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const adapters: Record<string, unknown> = {
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
    "react-i18next": { useTranslation: () => ({ t: (key: string) => i18n.t(key, { ns: "common" }) }) },
    "@/core/theme/use-mobile-styles": { useMobileStyles: () => ({ colors: styles, styles }) },
    "react/jsx-runtime": { jsx: (_type: unknown, props: object) => ({ props }), jsxs: (_type: unknown, props: object) => ({ props }) },
    "react-native": { StyleSheet: { create: (value: unknown) => value } },
    "@picket/design-tokens": { colors: styles, radii: styles, spacing: styles, typography: styles },
    "@/core/ui/mobile-palette": { radii: styles, spacing: styles, typography: styles },
  };
  runInNewContext(compiled, { exports: module.exports, require: (id: string) => adapters[id] ?? {} });
  let element = module.exports.PrimaryAction({ busy: true, label: "Save", onPress: () => {} });
  assert.equal(element.props.disabled, true); assert.equal(element.props.accessibilityState?.disabled, true);
  assert.equal((element.props.children[1] as Element).props.children, "Save");
  assert.equal((element.props.children[0] as Element).props.accessibilityLabel, "Đang xử lý");
  assert.equal(element.props.accessibilityState?.busy, true);
  await i18n.changeLanguage("en");
  element = module.exports.PrimaryAction({ busy: true, label: "Save", onPress: () => {} });
  assert.equal((element.props.children[0] as Element).props.accessibilityLabel, "Processing");
  assert.equal((element.props.children[1] as Element).props.children, "Save");
  const chip = module.exports.ChoiceChip({ disabled: true, checked: true, label: "Monthly", onPress: () => {} });
  assert.equal(chip.props.disabled, true); assert.equal(chip.props.accessibilityState?.disabled, true); assert.equal(chip.props.accessibilityState?.checked, true);
});
