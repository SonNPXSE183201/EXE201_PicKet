import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseWebLearningProgress, serializeWebLearningProgress } from '../src/features/learning/web-progress.ts';
import { lessonPathStates, parseLessonBlocksPack, scoreLessonQuiz, quizBlocks } from '../../packages/domain-ts/src/learning-blocks.ts';

const pack = parseLessonBlocksPack(JSON.parse(readFileSync(new URL('../src/features/learning/content/lesson-blocks.vi.v2.json', import.meta.url), 'utf8')));
const ids = new Set(pack.lessons.map((lesson) => lesson.lessonId));
const order = pack.stages.flatMap((stage) => stage.lessonIds);

test('web pack carries the same 30 lessons as the stage path', () => {
  assert.equal(pack.lessons.length, 30);
  assert.deepEqual([...order].sort(), [...ids].sort());
  for (const lesson of pack.lessons) assert.equal(quizBlocks(lesson).length, 3);
});

test('browser progress ignores corrupt data and unknown lessons', () => {
  assert.deepEqual(parseWebLearningProgress(null, ids), []);
  assert.deepEqual(parseWebLearningProgress('{bad', ids), []);
  assert.deepEqual(parseWebLearningProgress('{"version":2,"completed":[]}', ids), []);
  const stored = serializeWebLearningProgress([order[0], order[0], 'gone', order[1]]);
  assert.deepEqual(parseWebLearningProgress(stored, ids), [order[0], order[1]]);
});

test('path unlocks the next lesson after completion and quiz scoring counts first answers', () => {
  const states = lessonPathStates(order, new Set(parseWebLearningProgress(serializeWebLearningProgress([order[0]]), ids)));
  assert.equal(states.get(order[0]), 'done');
  assert.equal(states.get(order[1]), 'current');
  assert.equal(states.get(order[2]), 'locked');
  const lesson = pack.lessons[0];
  const [first, second] = quizBlocks(lesson);
  assert.deepEqual(scoreLessonQuiz(lesson, { [first.id]: first.correctIndex, [second.id]: (second.correctIndex + 1) % second.choices.length }),
    { total: 3, answered: 2, correct: 1, complete: false });
});
