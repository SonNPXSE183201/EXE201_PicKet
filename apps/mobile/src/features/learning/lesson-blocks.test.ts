import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  MAX_CARD_WORDS, blockAnswered, blockAnswersFromLegacy, countWords, estimateIsClose, legacyQuizAnswers,
  lessonPathStates, parseLessonBlocksPack, quizBlocks, scoreLessonQuiz,
  type LessonBlocksPack, type LessonEstimateBlock,
} from "@picket/domain";
import viSource from "./content/curriculum.vi.v1.json";
import enSource from "./content/curriculum.en.v1.json";
import { convertCurriculum, estimateFromExample, mythStatement, splitIntoCards } from "./lesson-blocks-converter";
import { assertPackMatchesCurriculum, lessonBlocksForLanguage, orderedLessons } from "./lesson-blocks";
import { curriculum, curriculumForLanguage, gradeQuiz } from "./curriculum";
import { createLearningProgressStore } from "./progress";

const root = path.resolve(import.meta.dirname, "../../../../..");
const readJson = (file: string) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const words = (text: string) => text.trim().split(/\s+/u);

test("generated VI/EN packs are exactly what the deterministic converter produces", () => {
  for (const [locale, source] of [["vi", viSource], ["en", enSource]] as const) {
    const expected = convertCurriculum(source as never);
    assert.deepEqual(convertCurriculum(clone(source) as never), expected, "conversion must be deterministic");
    assert.deepEqual(readJson(`apps/mobile/src/features/learning/content/lesson-blocks.${locale}.v2.json`), expected);
  }
  assert.deepEqual(readJson("web/src/features/learning/content/lesson-blocks.vi.v2.json"), convertCurriculum(viSource as never));
});

test("every lesson keeps its id, version and answer key, and all body text survives as short cards", () => {
  for (const [language, source] of [["vi", viSource], ["en", enSource]] as const) {
    const pack = lessonBlocksForLanguage(language);
    assert.equal(pack.lessons.length, 30);
    source.lessons.forEach((original, i) => {
      const lesson = pack.lessons[i];
      assert.equal(lesson.lessonId, original.lessonId);
      assert.equal(lesson.version, original.version);
      assert.deepEqual(quizBlocks(lesson).map(q => q.correctIndex), original.questions.map(q => q.correctIndex));
      const cards = lesson.blocks.filter(b => b.type === "card" && b.kind === "concept");
      assert.deepEqual(cards.flatMap(card => words(card.type === "card" ? card.text ?? "" : "")), words(original.body));
      for (const block of lesson.blocks) {
        if (block.type !== "card") continue;
        assert.ok(countWords(block.text ?? "") + (block.points ?? []).reduce((n, p) => n + countWords(p), 0) <= MAX_CARD_WORDS);
      }
      assert.ok(lesson.blocks.some(b => b.type === "myth"), `${lesson.lessonId} has a myth block`);
      assert.equal(lesson.blocks[0].type, "card");
    });
    assert.deepEqual(orderedLessons(pack).map(l => l.lessonId), pack.stages.flatMap(s => s.lessonIds));
  }
});

test("long sentences are split at clauses, then words, never exceeding the card limit", () => {
  const long = Array.from({ length: 70 }, (_, i) => `từ${i}`).join(" ");
  const cards = splitIntoCards(`Câu ngắn. ${long}, phần sau; đoạn cuối.`);
  assert.ok(cards.every(card => countWords(card) <= MAX_CARD_WORDS));
  assert.deepEqual(cards.flatMap(words), words(`Câu ngắn. ${long}, phần sau; đoạn cuối.`));
  // Decimal and thousand separators are not sentence ends.
  assert.deepEqual(splitIntoCards("Lương 12.000.000đ, đóng 10,5%. Xong."), ["Lương 12.000.000đ, đóng 10,5%. Xong."]);
});

test("myth statements and estimates are derived only from authored text", () => {
  assert.equal(mythStatement("Nghĩ rằng lãi kép không đáng kể."), "Lãi kép không đáng kể.");
  assert.equal(mythStatement("Believing the bonus is guaranteed."), "The bonus is guaranteed.");
  assert.equal(mythStatement("Coi bảo hiểm là tiết kiệm."), "Coi bảo hiểm là tiết kiệm.");
  const lesson = clone(viSource.lessons[0]);
  const estimate = estimateFromExample(lesson as never, "vi", "x") as LessonEstimateBlock;
  assert.equal(estimate.answer, 1260000);
  assert.match(estimate.prompt, /12\.000\.000 × 10,5% = \?$/);
  assert.equal((estimate.answer - estimate.min) % estimate.step, 0);
  lesson.workedExample.description = "Không có phép tính khớp.";
  assert.equal(estimateFromExample(lesson as never, "vi", "x"), null);
});

test("pack parser rejects blocks the player cannot render safely", () => {
  const base = convertCurriculum(viSource as never);
  const mutate = (change: (pack: LessonBlocksPack) => void) => { const pack = clone(base); change(pack); return pack; };
  assert.throws(() => parseLessonBlocksPack(mutate(p => { p.schemaVersion = 1 as 2; })));
  assert.throws(() => parseLessonBlocksPack(mutate(p => { (p.lessons[0].blocks[0] as { type: string }).type = "sort"; })), /Unknown block/);
  assert.throws(() => parseLessonBlocksPack(mutate(p => { p.lessons[0].blocks[0] = { type: "card", id: "x", kind: "concept", text: "a ".repeat(61) }; })), /too long/);
  assert.throws(() => parseLessonBlocksPack(mutate(p => { p.lessons[0].blocks = p.lessons[0].blocks.filter(b => b.type !== "quiz" || b.questionIndex !== 0); })), /every question/);
  assert.throws(() => parseLessonBlocksPack(mutate(p => { const e = p.lessons[0].blocks.find(b => b.type === "estimate") as LessonEstimateBlock; e.step = 11; })), /estimate/);
  assert.throws(() => parseLessonBlocksPack(mutate(p => { p.lessons[0].blocks[1].id = p.lessons[0].blocks[0].id; })), /block id/);
  // A pack that re-keys answers is refused even when it is well-formed.
  assert.throws(() => assertPackMatchesCurriculum(mutate(p => {
    const quiz = quizBlocks(p.lessons[0])[0]; quiz.correctIndex = (quiz.correctIndex + 1) % quiz.choices.length;
  }), curriculum), /answer key/);
});

test("quiz scoring matches v1 grading and drafts round-trip through question indexes", () => {
  const lesson = lessonBlocksForLanguage("vi").lessons[0];
  const quizzes = quizBlocks(lesson);
  const answers = Object.fromEntries(quizzes.map((q, i) => [q.id, i === 0 ? (q.correctIndex + 1) % q.choices.length : q.correctIndex]));
  assert.deepEqual(scoreLessonQuiz(lesson, {}), { total: 3, answered: 0, correct: 0, complete: false });
  const score = scoreLessonQuiz(lesson, answers);
  assert.deepEqual(score, { total: 3, answered: 3, correct: 2, complete: true });
  const legacy = legacyQuizAnswers(lesson, answers) as number[];
  assert.equal(gradeQuiz(curriculum.lessons[0], legacy).correct, score.correct);
  assert.deepEqual(blockAnswersFromLegacy(lesson, legacy), answers);
  assert.deepEqual(legacyQuizAnswers(lesson, { [quizzes[1].id]: 2 }), [null, 2, null]);
  assert.deepEqual(blockAnswersFromLegacy(lesson, [9, null, -1]), {});
  const myth = lesson.blocks.find(b => b.type === "myth")!;
  assert.equal(blockAnswered(lesson.blocks[0], {}), true);
  assert.equal(blockAnswered(myth, {}), false);
  assert.equal(blockAnswered(myth, { [myth.id]: 0 }), true);
  const estimate = lesson.blocks.find(b => b.type === "estimate") as LessonEstimateBlock;
  assert.equal(estimateIsClose(estimate, estimate.answer * 1.05), true);
  assert.equal(estimateIsClose(estimate, estimate.answer * 1.5), false);
});

test("stored v1 progress stays valid and drives the path states", async () => {
  const owner = "guest";
  const pack = lessonBlocksForLanguage("en");
  const ordered = orderedLessons(pack).map(l => l.lessonId);
  // A record written by the old screen (fixed 20 XP, v1 ids) loads unchanged.
  const legacy = { version: 1, completed: [{ owner, lessonId: ordered[1], version: 1, xp: 20, completedAt: "2026-11-01T00:00:00.000Z" }] };
  let stored: unknown = clone(legacy);
  const store = createLearningProgressStore({ read: async () => stored, write: async (_o, value) => { stored = value; } });
  assert.deepEqual(await store.load(owner), legacy);
  const next = await store.complete(owner, pack.lessons.find(l => l.lessonId === ordered[0])!.lessonId, 1);
  assert.deepEqual(next.completed.map(row => [row.lessonId, row.xp]), [[ordered[1], 20], [ordered[0], 20]]);
  const states = lessonPathStates(ordered, new Set(next.completed.map(row => row.lessonId)));
  assert.deepEqual([states.get(ordered[0]), states.get(ordered[1]), states.get(ordered[2]), states.get(ordered[3])], ["done", "done", "current", "locked"]);
  assert.equal([...states.values()].filter(s => s === "current").length, 1);
  assert.equal(curriculumForLanguage("en").lessons.length, pack.lessons.length);
});
