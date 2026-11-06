import { paperShape, paperSpace } from "../../core/theme/paper-foundations";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";
import { createAppI18n } from "../../core/i18n/instance";
import { formatMoney } from "../../core/i18n/formatters";
import { assessmentCase, assessmentCriteria, createAssessmentDraftStore, MAX_ASSESSMENT_ANSWER } from "./assessment-draft";
type Element = { type: unknown; props: Record<string, unknown> };
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as Element; return [element, ...elements(element.props.children)];
}
function text(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(text).join("");
  return node && typeof node === "object" && "props" in node ? text((node as Element).props.children) : "";
}
function harness(rows = new Map<string, unknown>()) {
  const i18n = createAppI18n("en"); const slots: unknown[] = []; let cursor = 0;
  const state = { failWrites: false, writes: 0 }; let writeWait = Promise.resolve();
  const store = createAssessmentDraftStore({ read: async owner => rows.get(owner), write: async (owner, value) => {
    await writeWait; if (state.failWrites) throw Error("Synthetic storage failure"); state.writes++; rows.set(owner, value);
  } }, () => "2026-10-25T00:00:00.000Z");
  const useState = (initial: unknown) => {
    const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
    return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
  };
  const useRef = (initial: unknown) => { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; };
  const useCallback = (value: unknown, deps: unknown[]) => {
    const index = cursor++, previous = slots[index] as { deps: unknown[]; value: unknown } | undefined;
    if (!previous || deps.some((part, key) => !Object.is(part, previous.deps[key]))) slots[index] = { deps, value };
    return (slots[index] as { value: unknown }).value;
  };
  const effect = (callback: () => void | (() => void), deps: unknown[]) => {
    const index = cursor++, previous = slots[index] as { deps: unknown[]; cleanup?: () => void } | undefined;
    if (!previous || deps.some((part, key) => !Object.is(part, previous.deps[key]))) { previous?.cleanup?.(); slots[index] = { deps, cleanup: callback() }; }
  };
  const timers = new Map<number, () => void>(); let timerId = 0;
  let background: ((state: string) => void) | undefined, confirmClear: (() => void) | undefined;
  const colors = new Proxy({}, { get: (_target, key) => String(key) });
  const adapters: Record<string, unknown> = {
    "@/core/ui/picket-text": { PicketText: "Text" },
    "@/core/ui/picket-scroll-view": { PicketScrollView: "ScrollView" },
    "@/core/theme/paper-foundations": { paperShape, paperSpace },
    react: { useState, useRef, useCallback, useEffect: effect },
    "react/jsx-runtime": { jsx: (type: unknown, props: object) => ({ type, props }), jsxs: (type: unknown, props: object) => ({ type, props }) },
    "react-i18next": { useTranslation: () => ({ t: (key: string, values: object) => i18n.t(key, { ...values, ns: "assessment" }) }) },
    "react-native": { AppState: { addEventListener: (_event: string, listener: (state: string) => void) => { background = listener; return { remove: () => { background = undefined; } }; } }, Alert: { alert: (_title: string, _description: string, buttons: { onPress?: () => void }[]) => { confirmClear = buttons[1].onPress; } } },
    "@/features/settings/appearance-provider": { useAppTheme: () => ({ colors, language: i18n.language }) },
    "@/core/i18n/formatters": { formatMoney },
    "@/core/ui/picket-text-input": { PicketTextInput: "Input" }, "@/core/ui/picket-ui": { PrimaryAction: "Primary", DangerAction: "Danger" },
    "./assessment-draft": { assessmentCase, assessmentCriteria, MAX_ASSESSMENT_ANSWER }, "./assessment-storage": { assessmentDrafts: store },
  };
  const module = { exports: {} as { AssessmentDraftCard(props: { owner: string }): Element } };
  const compiled = ts.transpileModule(readFileSync("src/features/learning/assessment-card.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(compiled, { exports: module.exports, require: (id: string) => adapters[id] ?? {},
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; }, clearTimeout: (id: number) => { timers.delete(id); } });
  function render() { cursor = 0; return module.exports.AssessmentDraftCard({ owner: "owner-A" }); }
  function input() { const result = elements(render()).find(node => node.type === "Input"); assert.ok(result); return result; }
  function change(value: string) { (input().props.onChangeText as (value: string) => void)(value); }
  function press(label: string) {
    const result = elements(render()).find(node => node.props.label === label); assert.ok(result, `Missing action ${label}`); assert.notEqual(result.props.disabled, true);
    (result.props.onPress as () => void)();
  }
  return { i18n, state, store, rows, render, input, change, press,
    timers: () => { const work = [...timers.values()]; timers.clear(); work.forEach(callback => callback()); },
    background: () => { assert.ok(background); background("background"); },
    confirmClear: () => { assert.ok(confirmClear); confirmClear(); },
    waitWrites: (value: Promise<void>) => { writeWait = value; },
    unmount: () => { for (const slot of slots) if (slot && typeof slot === "object" && "cleanup" in slot) (slot as { cleanup?: () => void }).cleanup?.(); },
  };
}
async function settle() { for (let index = 0; index < 8; index++) await new Promise(resolve => setImmediate(resolve)); }

test("assessment autosaves exact text, keeps it when language changes, and flushes on background", async () => {
  const app = harness(); app.render(); await settle();
  app.change("  Lập luận của tôi\nMy reasoning  "); await app.i18n.changeLanguage("vi");
  assert.equal(app.input().props.value, "  Lập luận của tôi\nMy reasoning  ");
  app.timers(); await settle(); assert.equal((await app.store.load("owner-A"))?.answer, app.input().props.value);
  assert.equal(await app.store.load("device-guest"), null);
  app.change("Latest answer"); app.background(); await settle();
  assert.equal((await app.store.load("owner-A"))?.answer, "Latest answer"); assert.equal(app.state.writes, 2);
});

test("future drafts are not overwritten; explicit deletion unlocks editing and failed saves retain text", async () => {
  const rows = new Map<string, unknown>([["owner-A", { schemaVersion: 99 }]]); const app = harness(rows);
  app.render(); await settle(); assert.equal(app.input().props.editable, false); assert.equal(app.state.writes, 0);
  app.press("Delete draft"); app.confirmClear(); await settle(); assert.equal(app.input().props.editable, true);
  app.change("Retain this answer"); app.state.failWrites = true; app.timers(); await settle();
  assert.equal(app.input().props.value, "Retain this answer"); assert.match(text(app.render()), /Changes could not be saved/);
  app.state.failWrites = false; app.press("Save draft now"); await settle(); assert.equal((await app.store.load("owner-A"))?.answer, "Retain this answer");
});

test("clearing an in-flight autosave cannot resurrect the old or newly queued text", async () => {
  const app = harness(); app.render(); await settle(); let release!: () => void;
  app.waitWrites(new Promise(resolve => { release = resolve; }));
  app.change("Old answer"); app.timers(); await settle(); app.change("New answer");
  app.press("Delete draft"); app.confirmClear(); app.timers();
  release(); await settle(); assert.equal(await app.store.load("owner-A"), null); assert.equal(app.input().props.value, "");
  app.timers(); app.unmount(); await settle(); assert.equal(await app.store.load("owner-A"), null);
});

test("leaving the card flushes the latest pending text without a network or grading operation", async () => {
  const app = harness(); app.render(); await settle(); app.change("Latest before leaving");
  app.unmount(); await settle(); assert.equal((await app.store.load("owner-A"))?.answer, "Latest before leaving");
  const source = readFileSync("src/features/learning/assessment-card.tsx", "utf8") + readFileSync("src/features/learning/assessment-storage.ts", "utf8");
  assert.doesNotMatch(source, /picketApi|supabase|fetch\(|console\./);
  assert.match(source, /readOfflineCache\(owner, "learning-assessment"\)/);
  assert.match(source, /writeOfflineCache\(owner, "learning-assessment", value\)/);
});

test("failed deletion keeps the answer visible and a stale native dialog cannot delete after unmount", async () => {
  const app = harness(); await app.store.save("owner-A", "Keep this draft"); app.render(); await settle();
  app.state.failWrites = true; app.press("Delete draft"); app.confirmClear(); await settle();
  assert.equal(app.input().props.value, "Keep this draft"); assert.match(text(app.render()), /Could not delete the draft/);
  app.state.failWrites = false; app.press("Delete draft"); app.unmount(); app.confirmClear(); await settle();
  assert.equal((await app.store.load("owner-A"))?.answer, "Keep this draft");
});
