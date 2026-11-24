/**
 * Card-based lesson format (schema v2). Packs are generated from the v1
 * curriculum by docs/learning/build-lesson-blocks.ts; lesson ids, versions and
 * quiz answer keys are copied unchanged so stored progress stays valid.
 *
 * This file must stay import-free: web tests load it directly with Node's
 * type stripping.
 */
export const LESSON_BLOCKS_SCHEMA_VERSION = 2;
/** Upper bound for one card; longer text is split by the converter. */
export const MAX_CARD_WORDS = 60;

export type LessonCardBlock = {
  type: "card";
  id: string;
  /** objective = lesson goal, concept = part of the lesson text, summary = key takeaways. */
  kind: "objective" | "concept" | "summary";
  text?: string;
  points?: string[];
};
export type LessonMythBlock = {
  type: "myth";
  id: string;
  statement: string;
  /** The statement is always a common misconception in v1 content. */
  answer: "myth" | "fact";
  explanation: string;
};
export type LessonQuizChoice = { text: string; explanation: string };
export type LessonQuizBlock = {
  type: "quiz";
  id: string;
  /** Index into the v1 lesson's questions; keeps cloud grading and drafts compatible. */
  questionIndex: number;
  prompt: string;
  choices: LessonQuizChoice[];
  correctIndex: number;
};
export type LessonEstimateBlock = {
  type: "estimate";
  id: string;
  prompt: string;
  answer: number;
  min: number;
  max: number;
  step: number;
  unit: "VND";
  explanation: string;
};
export type LessonBlock = LessonCardBlock | LessonMythBlock | LessonQuizBlock | LessonEstimateBlock;

export type BlockLesson = {
  lessonId: string;
  version: number;
  stageId?: string;
  title: string;
  objective: string;
  blocks: LessonBlock[];
  optionalAction: string;
  sources: string[];
};
export type BlockStage = { stageId: string; order: number; title: string; summary?: string; lessonIds: string[] };
export type LessonBlocksPack = {
  schemaVersion: 2;
  locale: string;
  sourceCurriculumId: string;
  sourceEditorialRevision: number;
  stages: BlockStage[];
  lessons: BlockLesson[];
};

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}

const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const fail = (message: string): never => { throw new Error(message); };

function parseBlock(raw: unknown, ids: Set<string>, questionIndexes: Set<number>): LessonBlock {
  const block = (raw ?? {}) as Record<string, unknown>;
  if (!isText(block.id) || ids.has(block.id)) fail("Invalid block id");
  ids.add(block.id as string);
  switch (block.type) {
    case "card": {
      if (block.kind !== "objective" && block.kind !== "concept" && block.kind !== "summary") fail("Invalid card kind");
      const points = block.points;
      if (points !== undefined && (!Array.isArray(points) || !points.length || !points.every(isText))) fail("Invalid card points");
      if (block.text !== undefined && !isText(block.text)) fail("Invalid card text");
      if (block.text === undefined && points === undefined) fail("Empty card");
      const words = countWords(String(block.text ?? "")) + (Array.isArray(points) ? points.reduce((sum: number, p) => sum + countWords(String(p)), 0) : 0);
      if (words > MAX_CARD_WORDS) fail(`Card ${String(block.id)} is too long`);
      return block as LessonCardBlock;
    }
    case "myth":
      if (!isText(block.statement) || !isText(block.explanation) || (block.answer !== "myth" && block.answer !== "fact")) fail("Invalid myth block");
      return block as LessonMythBlock;
    case "quiz": {
      const choices = block.choices;
      if (!isText(block.prompt) || !Array.isArray(choices) || choices.length < 2 ||
          choices.some(choice => !isText((choice as LessonQuizChoice)?.text) || !isText((choice as LessonQuizChoice)?.explanation)) ||
          !Number.isInteger(block.correctIndex) || (block.correctIndex as number) < 0 || (block.correctIndex as number) >= choices.length ||
          !Number.isInteger(block.questionIndex) || (block.questionIndex as number) < 0 || questionIndexes.has(block.questionIndex as number)) fail("Invalid quiz block");
      questionIndexes.add(block.questionIndex as number);
      return block as LessonQuizBlock;
    }
    case "estimate": {
      const { min, max, step, answer } = block as Record<string, number>;
      if (!isText(block.prompt) || !isText(block.explanation) || block.unit !== "VND" ||
          ![min, max, step, answer].every(Number.isSafeInteger) || step <= 0 || min < 0 || min >= max ||
          answer < min || answer > max || (answer - min) % step !== 0 || (max - min) % step !== 0) fail("Invalid estimate block");
      return block as LessonEstimateBlock;
    }
    default:
      return fail("Unknown block type");
  }
}

/** Validates a generated pack; throws on anything the player cannot render safely. */
export function parseLessonBlocksPack(value: unknown): LessonBlocksPack {
  const pack = (value ?? {}) as LessonBlocksPack;
  if (pack.schemaVersion !== LESSON_BLOCKS_SCHEMA_VERSION || !isText(pack.locale) || !Array.isArray(pack.lessons) || !pack.lessons.length ||
      !Array.isArray(pack.stages)) fail("Invalid lesson blocks pack");
  const lessonIds = new Set<string>();
  for (const lesson of pack.lessons) {
    if (!lesson || !isText(lesson.lessonId) || lessonIds.has(lesson.lessonId) || !Number.isInteger(lesson.version) || lesson.version < 1 ||
        !isText(lesson.title) || !isText(lesson.objective) || !Array.isArray(lesson.blocks) || !lesson.blocks.length ||
        !Array.isArray(lesson.sources)) fail("Invalid block lesson");
    lessonIds.add(lesson.lessonId);
    const ids = new Set<string>();
    const questions = new Set<number>();
    lesson.blocks.forEach(block => parseBlock(block, ids, questions));
    // Quiz blocks must cover question indexes 0..n-1 so v1 grading still works.
    if ([...questions].sort((a, b) => a - b).some((index, i) => index !== i)) fail("Quiz blocks must cover every question");
  }
  for (const stage of pack.stages) {
    if (!stage || !isText(stage.stageId) || !Array.isArray(stage.lessonIds) || stage.lessonIds.some(id => !lessonIds.has(id))) fail("Invalid block stage");
  }
  return pack;
}

/** Answers keyed by block id: quiz = choice index, myth = 0 (myth) / 1 (fact), estimate = guessed amount. */
export type LessonAnswers = Record<string, number>;

export function quizBlocks(lesson: Pick<BlockLesson, "blocks">): LessonQuizBlock[] {
  return lesson.blocks.filter((block): block is LessonQuizBlock => block.type === "quiz");
}

/** Score of the quiz blocks. Myth and estimate blocks are practice only and never change XP. */
export function scoreLessonQuiz(lesson: Pick<BlockLesson, "blocks">, answers: LessonAnswers) {
  const quizzes = quizBlocks(lesson);
  const answered = quizzes.filter(block => answers[block.id] !== undefined);
  return {
    total: quizzes.length,
    answered: answered.length,
    correct: answered.filter(block => answers[block.id] === block.correctIndex).length,
    complete: answered.length === quizzes.length,
  };
}

/** Answer array in v1 question order (for gradeQuiz, drafts and cloud attempts); unanswered = null. */
export function legacyQuizAnswers(lesson: Pick<BlockLesson, "blocks">, answers: LessonAnswers): (number | null)[] {
  const quizzes = quizBlocks(lesson);
  const result: (number | null)[] = Array.from({ length: quizzes.length }, () => null);
  for (const block of quizzes) result[block.questionIndex] = answers[block.id] ?? null;
  return result;
}

/** Inverse of legacyQuizAnswers: restores a saved v1 draft into block answers. */
export function blockAnswersFromLegacy(lesson: Pick<BlockLesson, "blocks">, legacy: readonly (number | null)[]): LessonAnswers {
  const answers: LessonAnswers = {};
  for (const block of quizBlocks(lesson)) {
    const value = legacy[block.questionIndex];
    if (Number.isInteger(value) && (value as number) >= 0 && (value as number) < block.choices.length) answers[block.id] = value as number;
  }
  return answers;
}

/** An estimate counts as close when it is within 10% of the answer. */
export function estimateIsClose(block: LessonEstimateBlock, guess: number): boolean {
  return Math.abs(guess - block.answer) <= Math.max(block.step, block.answer * 0.1);
}

/** Snaps a raw slider value to the estimate grid. */
export function snapEstimate(raw: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, raw));
  return Math.min(max, min + Math.round((clamped - min) / step) * step);
}
/** Coarse step for buttons, keyboard and TalkBack swipes: about 20 stops across the range. */
export function coarseEstimateStep(min: number, max: number, step: number): number {
  return Math.max(step, Math.round((max - min) / 20 / step) * step);
}
/** Starting slider position: the middle of the range, on the grid. */
export function initialEstimate(block: Pick<LessonEstimateBlock, "min" | "max" | "step">): number {
  return snapEstimate((block.min + block.max) / 2 - block.step / 2, block.min, block.max, block.step);
}

/** Whether the learner may move past this block. Cards never block; interactions need an answer. */
export function blockAnswered(block: LessonBlock, answers: LessonAnswers): boolean {
  return block.type === "card" || answers[block.id] !== undefined;
}

export type LessonPathState = "done" | "current" | "locked";
/**
 * Path states in display order: completed lessons stay done, the first
 * unfinished lesson is today's lesson, and later unfinished lessons are locked.
 */
export function lessonPathStates(orderedLessonIds: readonly string[], completedIds: ReadonlySet<string>): Map<string, LessonPathState> {
  const states = new Map<string, LessonPathState>();
  let currentAssigned = false;
  for (const id of orderedLessonIds) {
    if (completedIds.has(id)) states.set(id, "done");
    else if (!currentAssigned) { states.set(id, "current"); currentAssigned = true; }
    else states.set(id, "locked");
  }
  return states;
}
