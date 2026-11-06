import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function loadEffect(localMode: boolean, session: unknown) {
  const source = readFileSync(new URL("../../app/transactions/[id]/splits.tsx", import.meta.url), "utf8");
  const ast = ts.createSourceFile("splits.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let callback: ts.Expression | undefined;
  function visit(node: ts.Node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === "useEffect") callback ??= node.arguments[0]; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(callback);
  let reads = 0, loaded = false, writes = 0;
  const code = ts.transpileModule(`const run = ${callback.getText(ast)}; return run();`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const cleanup = new Function("localMode", "session", "id", "transaction", "getSplits", "setAmounts", "setMessage", "setLoaded", code)(localMode, session, "transaction-a", { id: "transaction-a" }, async () => { reads++; return []; }, () => { writes++; }, () => { writes++; }, (value: boolean) => { loaded = value; writes++; });
  return { cleanup, state: () => ({ reads, loaded, writes }) };
}
test("guest splits load from the real effect without requiring a cloud session", async () => {
  const effect = loadEffect(true, null); await new Promise(resolve => setImmediate(resolve));
  assert.equal(effect.state().reads, 1); assert.equal(effect.state().loaded, true);
});
test("signed-out effect does not read; unmounted split readers do not publish", async () => {
  const signedOut = loadEffect(false, null); assert.equal(signedOut.state().reads, 0);
  const effect = loadEffect(true, null); effect.cleanup?.(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(effect.state().writes, 0);
});
