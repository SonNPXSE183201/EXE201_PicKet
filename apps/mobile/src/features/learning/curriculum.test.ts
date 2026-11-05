import assert from "node:assert/strict";
import { test } from "node:test";
import source from "./content/curriculum.vi.v1.json";
import { validateCurriculum, gradeQuiz, recordCompletion } from "./curriculum";
test("thirty lessons have complete scenarios, references and publication status", () => {
  const curriculum = validateCurriculum(source);
  assert.equal(curriculum.lessons.length, 30);
  assert.equal(curriculum.publicationGate.publishable, false);
  assert.throws(() => validateCurriculum({ ...source, lessons: [{ ...source.lessons[0], sources: [] }] }));
});
test("unanswered quizzes do not become failing scores", () => {
  const lesson = validateCurriculum(source).lessons[0];
  assert.throws(() => gradeQuiz(lesson, []));
  const result = gradeQuiz(lesson, lesson.questions.map(q => q.correctIndex));
  assert.equal(result.correct, 3);
  assert.equal(result.explanations.length, 3);
});
test("replays do not grant duplicate XP and owner histories stay isolated", () => {
  const a = recordCompletion([], "guest", "lesson1", 1);
  assert.deepEqual(recordCompletion(a, "guest", "lesson1", 1), a);
  assert.equal(recordCompletion(a, "userB", "lesson1", 1).length, 2);
});
test("packs without the optional stage and figure fields still validate", () => {
  const legacy = JSON.parse(JSON.stringify(source));
  delete legacy.stages;
  legacy.lessons = legacy.lessons.slice(0, 12).map((lesson: Record<string, unknown>) => {
    const { stageId: _stage, citedFigures: _figures, ...rest } = lesson;
    return rest;
  });
  assert.equal(validateCurriculum(legacy).lessons.length, 12);
});
test("optional stages and cited figures are validated when present", () => {
  const clone = () => JSON.parse(JSON.stringify(source));
  const unknownStage = clone(); unknownStage.lessons[0].stageId = "stage-99";
  assert.throws(() => validateCurriculum(unknownStage), /stage/);
  const orphan = clone(); orphan.stages[0].lessonIds.pop();
  assert.throws(() => validateCurriculum(orphan), /stage/);
  const stageWithoutStages = clone(); delete stageWithoutStages.stages;
  assert.throws(() => validateCurriculum(stageWithoutStages), /stage/);
  const figureLesson = clone();
  const withFigure = figureLesson.lessons.find((l: { citedFigures?: unknown[] }) => l.citedFigures);
  withFigure.citedFigures[0].sourceId = "unregistered";
  assert.throws(() => validateCurriculum(figureLesson), /Cited figure/);
  const undated = clone();
  undated.lessons.find((l: { citedFigures?: unknown[] }) => l.citedFigures).citedFigures[0].asOf = "soon";
  assert.throws(() => validateCurriculum(undated), /Cited figure/);
});
