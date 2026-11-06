import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { createAppI18n } from "../../core/i18n/instance";
import { conflictVi, conflictEn } from "../../core/i18n/conflict-resources";

test("conflict labels, controlled messages and native accessibility have complete VI/EN resources", async () => {
  assert.deepEqual(Object.keys(conflictVi).sort(), Object.keys(conflictEn).sort());
  for (const value of Object.values(conflictEn)) assert.ok(value.trim().length > 0);
  for (const file of ["src/features/sync/conflict-screen.tsx", "src/features/sync/transaction-merge-editor.tsx"]) {
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) assert.ok(!/\p{L}/u.test(node.text.trim()), "Visible text bypasses translation: " + file);
      if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && ["accessibilityLabel","placeholder","label"].includes(node.name.getText(source))) assert.fail("Visible label bypasses translation: " + file);
      if (ts.isJsxExpression(node) && node.expression) assert.notEqual(node.expression.getText(source), "message");
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const i18n = createAppI18n("vi");
  const input = "Tên riêng: quán ăn";
  assert.equal(i18n.t("deviceValue", {ns:"conflicts",value:input}), "Trên máy: " + input);
  await i18n.changeLanguage("en");
  assert.equal(i18n.t("deviceValue", {ns:"conflicts",value:input}), "Device: " + input);
  assert.equal(i18n.t("kind.transaction.refund", {ns:"conflicts"}), "Refund");
});
