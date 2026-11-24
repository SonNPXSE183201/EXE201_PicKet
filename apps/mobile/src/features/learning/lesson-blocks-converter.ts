import {
  LESSON_BLOCKS_SCHEMA_VERSION, MAX_CARD_WORDS, countWords,
  type BlockLesson, type LessonBlock, type LessonBlocksPack, type LessonEstimateBlock,
} from "@picket/domain";

/**
 * Deterministic v1 curriculum -> v2 card blocks conversion. Pure: the same
 * input always yields byte-identical JSON (see docs/learning/build-lesson-blocks.ts).
 */
type SourceLesson = {
  lessonId: string; version: number; stageId?: string; title: string; objective: string; body: string;
  workedExample: { description: string; arithmeticChecks?: { expression: string; expected: number }[] };
  questions: { prompt: string; choices: { text: string; explanation: string }[]; correctIndex: number }[];
  optionalAction: { text: string };
  sources: string[];
  studySupport?: { keyTakeaways: string[]; misconception: string };
};
type SourceCurriculum = {
  curriculumId: string; locale: string; editorialRevision?: number;
  stages?: { stageId: string; order: number; title: string; summary?: string; lessonIds: string[] }[];
  lessons: SourceLesson[];
};

const SENTENCE_END = /(?<=[.!?…:])\s+(?=["“(\p{Lu}\p{N}•])/u;
const CLAUSE_END = /(?<=[;,])\s+/u;

/** Splits text at word boundaries so no piece exceeds `limit` words. */
function splitByWords(text: string, limit: number): string[] {
  const words = text.trim().split(/\s+/u);
  const pieces: string[] = [];
  for (let i = 0; i < words.length; i += limit) pieces.push(words.slice(i, i + limit).join(" "));
  return pieces;
}

/** Greedily packs units (sentences or clauses) into chunks of at most `limit` words. */
function pack(units: string[], limit: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    const candidate = current ? `${current} ${unit}` : unit;
    if (countWords(candidate) <= limit) { current = candidate; continue; }
    if (current) chunks.push(current);
    current = unit;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Breaks a paragraph into short cards: sentences first, then clauses, then raw words. */
export function splitIntoCards(paragraph: string, limit = MAX_CARD_WORDS): string[] {
  const sentences = paragraph.trim().split(SENTENCE_END).flatMap(sentence => {
    if (countWords(sentence) <= limit) return [sentence];
    return pack(sentence.split(CLAUSE_END), limit).flatMap(part => countWords(part) <= limit ? [part] : splitByWords(part, limit));
  });
  return pack(sentences, limit);
}

const MYTH_PREFIXES = [/^Nghĩ rằng\s+/u, /^Cho rằng\s+/u, /^Believing (that )?/u, /^Thinking (that )?/u, /^Assuming (that )?/u];
/** Turns "Believing X" into the claim "X" so it can be judged as myth or fact. */
export function mythStatement(misconception: string): string {
  for (const prefix of MYTH_PREFIXES) {
    if (prefix.test(misconception)) {
      const rest = misconception.replace(prefix, "");
      return rest.charAt(0).toLocaleUpperCase() + rest.slice(1);
    }
  }
  return misconception;
}

function formatAmount(amount: number, locale: string): string {
  const digits = String(amount);
  const separator = locale.startsWith("vi") ? "." : ",";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Largest 1/2/5 x 10^k step that divides the answer and gives at least ten stops below it. */
function estimateStep(answer: number): number {
  let best = 1;
  for (let power = 1; power <= answer; power *= 10) {
    for (const factor of [1, 2, 5]) {
      const step = factor * power;
      if (step * 10 <= answer && answer % step === 0) best = Math.max(best, step);
    }
  }
  return best;
}

/**
 * Finds the first worked calculation of the form "a × b = <expected>" in the
 * example text and turns it into a slider estimate. Returns null when the text
 * does not show the checked result verbatim, so nothing is invented.
 */
export function estimateFromExample(lesson: SourceLesson, locale: string, id: string): LessonEstimateBlock | null {
  const check = lesson.workedExample.arithmeticChecks?.[0];
  if (!check || !Number.isSafeInteger(check.expected) || check.expected < 1000) return null;
  const firstLine = lesson.workedExample.description.split("\n")[0];
  const shown = formatAmount(check.expected, locale);
  for (const segment of firstLine.split(/(?<=[;.])\s+/u)) {
    const match = segment.match(/^(?:[^:=]{1,40}:\s*)?([^=]+?)\s*=\s*([\d.,]+)/u);
    if (!match || match[2].replace(/[.,]$/u, "") !== shown) continue;
    const step = estimateStep(check.expected);
    const prefix = locale.startsWith("vi") ? "Ước tính nhanh" : "Quick estimate";
    return {
      type: "estimate", id, prompt: `${prefix}: ${match[1].trim()} = ?`, answer: check.expected,
      min: 0, max: check.expected * 2, step, unit: "VND", explanation: segment.replace(/[;.]$/u, "").trim(),
    };
  }
  return null;
}

export function convertLesson(lesson: SourceLesson, locale: string): BlockLesson {
  const n = lesson.lessonId.split(".").pop();
  const blocks: LessonBlock[] = [{ type: "card", id: `${n}-objective`, kind: "objective", text: lesson.objective }];
  const estimate = estimateFromExample(lesson, locale, `${n}-estimate`);
  // The guess comes before the text that reveals the answer.
  if (estimate) blocks.push(estimate);
  lesson.body.split(/\n\s*\n/u).flatMap(paragraph => splitIntoCards(paragraph)).forEach((text, i) => {
    blocks.push({ type: "card", id: `${n}-card-${i + 1}`, kind: "concept", text });
  });
  const support = lesson.studySupport;
  // The reveal shows the lesson's first takeaway as the point to remember.
  if (support) {
    blocks.push({ type: "myth", id: `${n}-myth`, statement: mythStatement(support.misconception), answer: "myth",
      explanation: support.keyTakeaways[0] });
  }
  lesson.questions.forEach((question, i) => {
    blocks.push({ type: "quiz", id: `${n}-quiz-${i + 1}`, questionIndex: i, prompt: question.prompt,
      choices: question.choices.map(choice => ({ text: choice.text, explanation: choice.explanation })), correctIndex: question.correctIndex });
  });
  if (support) {
    if (pack(support.keyTakeaways, MAX_CARD_WORDS).length === 1) {
      blocks.push({ type: "card", id: `${n}-summary`, kind: "summary", points: [...support.keyTakeaways] });
    } else {
      support.keyTakeaways.forEach((point, i) => blocks.push({ type: "card", id: `${n}-summary-${i + 1}`, kind: "summary", points: [point] }));
    }
  }
  return {
    lessonId: lesson.lessonId, version: lesson.version, ...(lesson.stageId ? { stageId: lesson.stageId } : {}),
    title: lesson.title, objective: lesson.objective, blocks, optionalAction: lesson.optionalAction.text, sources: [...lesson.sources],
  };
}

export function convertCurriculum(source: SourceCurriculum): LessonBlocksPack {
  const locale = source.locale.split("-")[0].toLowerCase();
  return {
    schemaVersion: LESSON_BLOCKS_SCHEMA_VERSION,
    locale,
    sourceCurriculumId: source.curriculumId,
    sourceEditorialRevision: source.editorialRevision ?? 1,
    stages: (source.stages ?? []).map(stage => ({ stageId: stage.stageId, order: stage.order, title: stage.title,
      ...(stage.summary ? { summary: stage.summary } : {}), lessonIds: [...stage.lessonIds] })),
    lessons: source.lessons.map(lesson => convertLesson(lesson, locale)),
  };
}
