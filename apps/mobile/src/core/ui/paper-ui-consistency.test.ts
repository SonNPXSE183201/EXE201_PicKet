import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "../..");
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : entry.name.endsWith(".tsx") ? [path.join(directory, entry.name)] : []);
}

test("all mobile text goes through the shared Vietnamese typography, including feature inline content", () => {
  const violations: string[] = [];
  for (const file of files(root)) {
    if (file.endsWith("picket-text.tsx")) continue;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== "react-native") continue;
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.some(element => !element.isTypeOnly && (element.propertyName?.text ?? element.name.text) === "Text")) violations.push(path.relative(root, file));
    }
  }
  assert.deepEqual(violations, []);
});

test("custom route scroll views share dock clearance rather than maintaining fixed page padding", () => {
  const violations = files(path.join(root, "app")).filter(file => {
    const source = readFileSync(file, "utf8");
    return /<ScrollView\b/.test(source) && !source.includes("PicketScrollView as ScrollView");
  });
  assert.deepEqual(violations, []);
});
