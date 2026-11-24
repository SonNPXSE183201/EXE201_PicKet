/**
 * Regenerates the card-based lesson packs (schema v2) from the v1 curriculum.
 * Deterministic: re-running without content changes produces identical files.
 *
 *   cd apps/mobile && node --import tsx ../../docs/learning/build-lesson-blocks.ts [--check]
 *
 * --check exits non-zero when a generated file is stale instead of writing it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseLessonBlocksPack } from "@picket/domain";
import { convertCurriculum } from "../../apps/mobile/src/features/learning/lesson-blocks-converter";

const root = path.resolve(import.meta.dirname, "../..");
const mobileContent = path.join(root, "apps/mobile/src/features/learning/content");
// The web workspace is Vietnamese-only, so it ships the VI pack alone.
const targets: Record<"vi" | "en", string[]> = {
  vi: [path.join(mobileContent, "lesson-blocks.vi.v2.json"), path.join(root, "web/src/features/learning/content/lesson-blocks.vi.v2.json")],
  en: [path.join(mobileContent, "lesson-blocks.en.v2.json")],
};

const check = process.argv.includes("--check");
let stale = 0;
for (const locale of ["vi", "en"] as const) {
  const source = JSON.parse(readFileSync(path.join(mobileContent, `curriculum.${locale}.v1.json`), "utf8"));
  const text = `${JSON.stringify(parseLessonBlocksPack(convertCurriculum(source)), null, 2)}\n`;
  for (const target of targets[locale]) {
    let current = "";
    try { current = readFileSync(target, "utf8"); } catch { /* first generation */ }
    if (current === text) continue;
    if (check) { stale++; console.error(`stale: ${path.relative(root, target)}`); continue; }
    writeFileSync(target, text, "utf8");
    console.log(`wrote ${path.relative(root, target)}`);
  }
}
if (stale) process.exit(1);
