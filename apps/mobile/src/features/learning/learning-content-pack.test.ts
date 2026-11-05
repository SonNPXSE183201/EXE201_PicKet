import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { runInNewContext } from "node:vm";

const root = path.resolve(import.meta.dirname, "../../../../..");
const read = (locale: string) => JSON.parse(readFileSync(
  path.join(import.meta.dirname, `content/curriculum.${locale}.v1.json`), "utf8",
));
// Answer keys of the original 12 lessons must never change: stored progress depends on them.
const answerKeys = [[1,1,2],[0,1,2],[1,0,2],[1,2,0],[1,0,2],[1,2,0],
  [1,0,2],[0,1,2],[1,0,2],[1,2,0],[1,0,2],[1,1,2]];
const lessonId = (n: number) => `picket.vi.financial.v1.${String(n).padStart(2, "0")}`;
type QuizRow = { correctIndex: number; choices: unknown[] };

test("every VI/EN lesson has complete takeaways and a fully worked fictional practice", () => {
  for (const locale of ["vi", "en"]) {
    const course = read(locale);
    assert.equal(course.editorialRevision, 3);
    assert.equal(course.lessons.length, 30);
    for (const lesson of course.lessons) {
      const support = lesson.studySupport;
      assert.ok(support, `${locale}/${lesson.lessonId} is missing learning support`);
      assert.equal(support.synthetic, true);
      assert.equal(support.keyTakeaways.length, 3);
      assert.ok(support.solutionSteps.length >= 3);
      for (const text of [...support.keyTakeaways, ...support.solutionSteps,
        support.misconception, support.practicePrompt, support.answer]) {
        assert.equal(typeof text, "string");
        assert.ok(text.trim().length > 15);
        assert.ok(lesson.workedExample.description.includes(text));
      }
    }
  }
});

test("editorial enrichment preserves existing quiz identities, grading and local source parity", () => {
  for (const locale of ["vi", "en"]) {
    const course = read(locale);
    const docs = JSON.parse(readFileSync(path.join(root, "docs/learning",
      `PICKET_FINANCIAL_CURRICULUM_${locale.toUpperCase()}_V1.json`), "utf8"));
    assert.deepEqual(course, docs);
    assert.equal(course.publicationGate.publishable, false);
    const byId = new Map(course.lessons.map((lesson: { lessonId: string }) => [lesson.lessonId, lesson]));
    assert.deepEqual([...byId.keys()].sort(), Array.from({ length: 30 }, (_, i) => lessonId(i + 1)));
    answerKeys.forEach((key, i) => {
      const lesson = byId.get(lessonId(i + 1)) as { questions: QuizRow[] };
      assert.deepEqual(lesson.questions.map(q => q.correctIndex), key);
    });
    for (const lesson of course.lessons) {
      assert.equal(lesson.version, 1);
      assert.equal(lesson.questions.length, 3);
      for (const q of lesson.questions as QuizRow[]) {
        assert.equal(q.choices.length, 3);
        assert.ok(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < 3);
      }
      assert.equal(lesson.optionalAction.requiresSpending, false);
      assert.equal(lesson.optionalAction.maySkip, true);
      assert.equal(lesson.independentReviewedAt, null);
      assert.equal(lesson.status, "self-reviewed-pending-owner-approval");
    }
  }
});

test("all authored worked calculations are correct and identical across translations", () => {
  const vi = read("vi"), en = read("en");
  let count = 0;
  for (let i = 0; i < vi.lessons.length; i++) {
    const checks = vi.lessons[i].workedExample.arithmeticChecks;
    assert.deepEqual(checks, en.lessons[i].workedExample.arithmeticChecks);
    for (const check of checks) {
      assert.match(check.expression, /^[0-9+*/(). -]+$/);
      assert.equal(runInNewContext(check.expression, Object.create(null), { timeout: 100 }), check.expected);
      count++;
    }
  }
  assert.ok(count > 30, "new practice calculations must also be verified");
});

test("four learning stages cover every lesson once, in display order, identically in VI/EN", () => {
  const vi = read("vi"), en = read("en");
  assert.deepEqual(vi.stages.map((s: { stageId: string }) => s.stageId),
    ["stage-01-foundation", "stage-02-stability", "stage-03-protection", "stage-04-growth"]);
  const order = vi.stages.flatMap((s: { lessonIds: string[] }) => s.lessonIds);
  assert.deepEqual(order, vi.lessons.map((l: { lessonId: string }) => l.lessonId));
  assert.deepEqual(en.stages.map((s: { lessonIds: string[] }) => s.lessonIds), vi.stages.map((s: { lessonIds: string[] }) => s.lessonIds));
  for (const stage of vi.stages) {
    for (const id of stage.lessonIds) {
      assert.equal(vi.lessons.find((l: { lessonId: string }) => l.lessonId === id).stageId, stage.stageId);
    }
  }
});

test("every regulatory figure cites a registered source accessed on a recorded date", () => {
  for (const locale of ["vi", "en"]) {
    const course = read(locale);
    const registry = new Map(course.sourceRegistry.map((r: { id: string; accessedAt: string }) => [r.id, r]));
    const urls = new Set(course.sourceRegistry.map((r: { url: string }) => r.url));
    let figures = 0;
    for (const lesson of course.lessons) {
      for (const url of lesson.sources) assert.ok(urls.has(url), `${lesson.lessonId} source not registered`);
      for (const figure of lesson.citedFigures ?? []) {
        assert.ok(registry.has(figure.sourceId), figure.sourceId);
        assert.ok(lesson.sources.includes((registry.get(figure.sourceId) as { url: string }).url));
        assert.match(figure.asOf, /^\d{4}-\d{2}-\d{2}$/);
        figures++;
      }
    }
    assert.ok(figures >= 10);
    const added = course.sourceRegistry.filter((r: { accessedAt: string }) => r.accessedAt === "2026-11-05");
    assert.ok(added.length >= 10);
  }
});
