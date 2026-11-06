import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import vi from "./content/curriculum.vi.v1.json";
import en from "./content/curriculum.en.v1.json";

/** Server answer keys (all migrations) must match the bundled lessons exactly. */
function serverKeys() {
  const dir = "../../supabase/migrations/";
  const keys = new Map<string, { answers: number[]; counts: number[] }>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(dir + file, "utf8");
    for (const m of sql.matchAll(/\('(picket\.vi\.financial\.v1\.\d+)',(\d+),ARRAY\[([\d,]+)\],ARRAY\[([\d,]+)\],(?:true|false)\)/g)) {
      keys.set(`${m[1]}@${m[2]}`, { answers: m[3].split(",").map(Number), counts: m[4].split(",").map(Number) });
    }
  }
  return keys;
}

test("every lesson has a server answer key identical to the bundled quiz", () => {
  const keys = serverKeys();
  assert.equal(vi.lessons.length, 30);
  for (const lesson of vi.lessons) {
    const key = keys.get(`${lesson.lessonId}@${lesson.version}`);
    assert.ok(key, `missing answer key for ${lesson.lessonId}`);
    assert.deepEqual(key.answers, lesson.questions.map((q) => q.correctIndex), lesson.lessonId);
    assert.deepEqual(key.counts, lesson.questions.map((q) => q.choices.length), lesson.lessonId);
  }
});

test("the English pack shares lesson IDs and answer order with Vietnamese", () => {
  for (const [index, lesson] of en.lessons.entries()) {
    assert.equal(lesson.lessonId, vi.lessons[index].lessonId);
    assert.deepEqual(lesson.questions.map((q) => q.correctIndex), vi.lessons[index].questions.map((q) => q.correctIndex));
  }
});
