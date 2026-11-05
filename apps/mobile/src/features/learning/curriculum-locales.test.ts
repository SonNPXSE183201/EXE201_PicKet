import assert from "node:assert/strict";
import { test } from "node:test";
import { curriculumForLanguage } from "./curriculum";
test("translated lessons retain stable identity and answer ordering", () => {
 const vi = curriculumForLanguage("vi");
 const en = curriculumForLanguage("en");
 assert.equal(en.locale, "en-US");
 assert.equal(en.lessons.length, vi.lessons.length);
 for (let i=0;i<vi.lessons.length;i++) {
  assert.equal(en.lessons[i].lessonId, vi.lessons[i].lessonId);
  assert.equal(en.lessons[i].stageId, vi.lessons[i].stageId);
  assert.notEqual(en.lessons[i].body, vi.lessons[i].body);
  assert.deepEqual(en.lessons[i].questions.map(q=>q.correctIndex),vi.lessons[i].questions.map(q=>q.correctIndex));
 }
 assert.equal(en.publicationGate.publishable,false);
 assert.equal(curriculumForLanguage("unknown").locale,"vi-VN");
});
