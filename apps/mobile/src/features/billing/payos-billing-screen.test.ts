import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

type Node = { type: unknown; props: Record<string, any> };
function nodes(value: any): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return value?.props ? [value, ...nodes(value.props.children)] : [];
}
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
function harness() {
  const slots: any[] = [];
  let cursor = 0, uuid = 0, failCheckout = false;
  let customer: any = { catalog: [{ sku: "plus", tier: "plus", months: 1, amount: 19000 }], orders: [] };
  let tier = "free";
  let foreground: (state: string) => void = () => {};
  const calls: any[] = [];
  const state = (initial: any) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value: any) => { slots[index] = value; }];
  };
  const effect = (callback: () => any, deps: any[]) => {
    const index = cursor++;
    if (!slots[index] || deps.some((dep, i) => dep !== slots[index].deps[i])) {
      slots[index]?.cleanup?.();
      slots[index] = { deps, cleanup: callback() };
    }
  };
  const api = {
    paymentCustomer: async () => customer,
    currentEntitlements: async () => ({ tier }),
    paymentCheckout: async (_token: string, sku: string, key: string) => {
      calls.push({ sku, key });
      if (failCheckout) { failCheckout = false; throw new Error("Connection lost"); }
      customer = { ...customer, orders: [{ id: key, order_code: 1, amount: 19000, tier: "plus", status: "pending", expires_at: "2099-01-01", checkout_url: "https://pay.payos.vn/web/qa" }] };
      return customer;
    },
    paymentAction: async (_token: string, id: string, action: string) => {
      calls.push({ id, action });
      if (action === "cancel") customer = { ...customer, orders: customer.orders.map((order: any) => ({ ...order, status: "cancelled" })) };
      return customer;
    },
  };
  const modules: Record<string, any> = {
    react: { useState: state, useRef: (value: any) => { const index = cursor++; return slots[index] ??= { current: value }; }, useEffect: effect },
    "react/jsx-runtime": { jsx: (type: any, props: any) => ({ type, props }), jsxs: (type: any, props: any) => ({ type, props }) },
    "react-native": { View: "View", AppState: { addEventListener: (_event: string, callback: typeof foreground) => { foreground = callback; return { remove() {} }; } }, Linking: { openURL: async (url: string) => { calls.push({ url }); } } },
    "expo-router": { Redirect: "Redirect" }, "expo-crypto": { randomUUID: () => `request-${++uuid}` },
    "@picket/domain": { formatVnd: (amount: number) => String(amount) },
    "@/core/api/client": { picketApi: api },
    "@/features/auth/auth-context": { useAuth: () => ({ session: { user: { id: "qa" }, access_token: "session" } }) },
    "@/features/auth/auth-screen": Object.fromEntries(["AuthMessage", "AuthScreen", "PrimaryButton", "TextLink"].map((name) => [name, name])),
    "@/core/ui/picket-text": { PicketText: "Text" },
    "react-i18next": { useTranslation: () => ({ t: (key: string) => key }) },
  };
  const module = { exports: {} as any };
  vm.runInNewContext(ts.transpileModule(readFileSync("src/features/billing/payos-billing-screen.tsx", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    module, exports: module.exports, require: (name: string) => { assert.ok(modules[name], name); return modules[name]; },
    Date, Map, Promise,
  });
  function render() {
    cursor = 0;
    const outer = module.exports.PayosBillingScreen();
    return outer.type(outer.props);
  }
  return {
    render, calls,
    setTier: (value: string) => { tier = value; },
    failNextCheckout: () => { failCheckout = true; },
    setOrders: (orders: any[]) => { customer = { ...customer, orders }; },
    foreground: () => foreground("active"),
    press(label: string) {
      const button = nodes(render()).find((node) => node.props.label === label);
      assert.ok(button, `Missing control: ${label}`);
      button.props.onPress();
    },
    button(label: string) { return nodes(render()).find((node) => node.props.label === label); },
    text: () => JSON.stringify(render()),
  };
}

test("an unpaid order can be cancelled from the native screen", async () => {
  const app = harness(); app.render(); await settle();
  app.press("Tạo thanh toán"); await settle();
  app.press("Hủy thanh toán"); await settle();
  assert.deepEqual(app.calls.at(-1), { id: "request-1", action: "cancel" });
  assert.match(app.text(), /Đã hủy/);
});
test("a new checkout after cancellation uses a fresh idempotency key", async () => {
  const app = harness(); app.render(); await settle();
  app.press("Tạo thanh toán"); await settle();
  app.press("Hủy thanh toán"); await settle();
  app.press("Tạo thanh toán"); await settle();
  assert.deepEqual(app.calls.filter((call) => call.sku).map((call) => call.key), ["request-1", "request-2"]);
});
test("an active paid plan is visible and prevents another checkout", async () => {
  const app = harness(); app.setTier("plus"); app.render(); await settle();
  assert.match(app.text(), /PLUS/);
  assert.match(app.text(), /Gói hiện tại/);
  assert.equal(app.button("Tạo thanh toán")?.props.disabled, true);
});
test("returning from checkout refreshes the paid order and plan", async () => {
  const app = harness(); app.render(); await settle();
  app.press("Tạo thanh toán"); await settle();
  app.press("Mở thanh toán"); await settle();
  app.setTier("plus"); app.setOrders([{ id: "request-1", order_code: 1, amount: 19000, status: "paid" }]);
  app.foreground(); await settle();
  assert.match(app.text(), /Đã thanh toán/); assert.match(app.text(), /PLUS/);
  assert.equal(app.button("Hủy thanh toán"), undefined);
  assert.deepEqual(app.calls.find((call) => call.url), { url: "https://pay.payos.vn/web/qa" });
});
test("retry after a lost checkout response reuses its idempotency key", async () => {
  const app = harness(); app.render(); await settle(); app.failNextCheckout();
  app.press("Tạo thanh toán"); await settle();
  assert.match(app.text(), /Không thể cập nhật thanh toán/);
  app.press("Tạo thanh toán"); await settle();
  assert.deepEqual(app.calls.filter((call) => call.sku).map((call) => call.key), ["request-1", "request-1"]);
});
test("rapid checkout taps dispatch a single payment request", async () => {
  const app = harness(); app.render(); await settle();
  app.press("Tạo thanh toán"); app.press("Tạo thanh toán"); await settle();
  assert.equal(app.calls.filter((call) => call.sku).length, 1);
});
