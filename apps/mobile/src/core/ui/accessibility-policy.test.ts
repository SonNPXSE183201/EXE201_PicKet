import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const sourceRoot = path.resolve(import.meta.dirname, "../..");
const wrapperPath = path.join(import.meta.dirname, "accessible-pressable.tsx");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(entryPath);
    return entry.name.endsWith(".tsx") ? [entryPath] : [];
  });
}

test("shared pressable enforces a 48 dp minimum touch target", () => {
  const source = readFileSync(wrapperPath, "utf8");
  assert.match(source, /minimumTouchTarget\s*=\s*48/);
  assert.match(source, /minHeight:\s*minimumTouchTarget/);
  assert.match(source, /minWidth:\s*minimumTouchTarget/);
});

test("screens do not import React Native Pressable directly", () => {
  const violations = sourceFiles(sourceRoot)
    .filter((file) => file !== wrapperPath)
    .filter((file) => {
      const source = readFileSync(file, "utf8");
      return /import\s*\{[^}]*\bPressable\b[^}]*\}\s*from\s*["']react-native["']/.test(source);
    });
  assert.deepEqual(violations, []);
});

test("every Pressable screen uses the accessible wrapper", () => {
  const violations = sourceFiles(sourceRoot)
    .filter((file) => file !== wrapperPath)
    .filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("<Pressable") &&
        !source.includes("AccessiblePressable as Pressable");
    });
  assert.deepEqual(violations, []);
});

test("every TextInput has an explicit accessible name", () => {
  const violations = sourceFiles(sourceRoot).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/<TextInput\b[\s\S]*?\/>/g)]
      .filter((match) => !/\baccessibilityLabel\s*=/.test(match[0]))
      .map((match) => {
        const line = source.slice(0, match.index).split("\n").length;
        return `${path.relative(sourceRoot, file)}:${line}`;
      });
  });

  assert.deepEqual(violations, []);
});

test("every loading indicator has an explicit accessible name", () => {
  const violations = sourceFiles(sourceRoot).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/<ActivityIndicator\b[\s\S]*?\/>/g)]
      .filter((match) => !/\baccessibilityLabel\s*=/.test(match[0]))
      .map((match) => {
        const line = source.slice(0, match.index).split("\n").length;
        return `${path.relative(sourceRoot, file)}:${line}`;
      });
  });

  assert.deepEqual(violations, []);
});

test("every image is named or explicitly decorative", () => {
  const violations = sourceFiles(sourceRoot).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(/<Image\b[\s\S]*?\/>/g)]
      .filter(
        (match) =>
          !/\baccessibilityLabel\s*=/.test(match[0]) &&
          !/\baccessible\s*=\s*\{false\}/.test(match[0]),
      )
      .map((match) => {
        const line = source.slice(0, match.index).split("\n").length;
        return `${path.relative(sourceRoot, file)}:${line}`;
      });
  });

  assert.deepEqual(violations, []);
});
