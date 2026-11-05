import source from "./content/curriculum.vi.v1.json";
import englishSource from "./content/curriculum.en.v1.json";
export type Curriculum = typeof source;
export type Lesson = Curriculum["lessons"][number];
// Optional schema-v1 extensions (editorial revision 3). Packs without them stay valid.
type StageShape = { stageId?: unknown; order?: unknown; title?: unknown; lessonIds?: unknown };
type CitedFigureShape = { claim?: unknown; sourceId?: unknown; asOf?: unknown };
type OptionalLessonFields = { stageId?: unknown; citedFigures?: unknown };
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
function validateStages(stages: unknown, lessons: readonly { lessonId: string }[]): Set<string> | null {
  if (stages === undefined) return null;
  if (!Array.isArray(stages) || !stages.length) throw new Error("Invalid stages");
  const stageIds = new Set<string>();
  const listed = new Set<string>();
  const known = new Set(lessons.map(lesson => lesson.lessonId));
  for (const raw of stages as StageShape[]) {
    if (!raw || typeof raw.stageId !== "string" || !raw.stageId || stageIds.has(raw.stageId) || !Number.isInteger(raw.order) ||
        typeof raw.title !== "string" || !raw.title || !Array.isArray(raw.lessonIds) || !raw.lessonIds.length) throw new Error("Invalid stage");
    stageIds.add(raw.stageId);
    for (const id of raw.lessonIds) {
      if (typeof id !== "string" || !known.has(id) || listed.has(id)) throw new Error("Invalid stage lesson");
      listed.add(id);
    }
  }
  if (listed.size !== known.size) throw new Error("Every lesson must belong to one stage");
  return stageIds;
}
function validateOptionalLessonFields(lesson: OptionalLessonFields, stageIds: Set<string> | null, sourceIds: Set<string>) {
  if (stageIds ? typeof lesson.stageId !== "string" || !stageIds.has(lesson.stageId) : lesson.stageId !== undefined) throw new Error("Invalid lesson stage");
  if (lesson.citedFigures === undefined) return;
  if (!Array.isArray(lesson.citedFigures) || !lesson.citedFigures.length) throw new Error("Invalid cited figures");
  for (const figure of lesson.citedFigures as CitedFigureShape[]) {
    if (!figure || typeof figure.claim !== "string" || !figure.claim || typeof figure.sourceId !== "string" || !sourceIds.has(figure.sourceId) ||
        typeof figure.asOf !== "string" || !isoDay.test(figure.asOf)) throw new Error("Cited figure needs a registered source and date");
  }
}
export function validateCurriculum(value: unknown): Curriculum {
  if (!value || typeof value !== "object") throw new Error("Missing curriculum");
  const data = value as Curriculum;
  if (data.schemaVersion !== 1 || !Array.isArray(data.lessons) || !data.lessons.length || typeof data.publicationGate?.publishable !== "boolean") throw new Error("Invalid curriculum");
  const stageIds = validateStages((data as { stages?: unknown }).stages, data.lessons);
  const registry = (data as { sourceRegistry?: unknown }).sourceRegistry;
  const sourceIds = new Set(Array.isArray(registry) ? registry.map((row: { id?: unknown }) => String(row?.id)) : []);
  const ids = new Set<string>();
  for (const lesson of data.lessons) {
    if (!lesson.lessonId || ids.has(lesson.lessonId) || !lesson.title || !lesson.objective || !lesson.body || !Number.isInteger(lesson.version) || lesson.version < 1) throw new Error("Invalid lesson");
    ids.add(lesson.lessonId);
    validateOptionalLessonFields(lesson as OptionalLessonFields, stageIds, sourceIds);
    if (!Array.isArray(lesson.sources) || !lesson.sources.length || lesson.sources.some(url => { try { return new URL(url).protocol !== "https:"; } catch { return true; } })) throw new Error("Missing lesson sources");
    if (!Array.isArray(lesson.questions) || lesson.questions.length < 2) throw new Error("Missing quiz");
    for (const q of lesson.questions) {
      if (!q.prompt || !Array.isArray(q.choices) || q.choices.length < 2 || q.choices.some(c => !c.text || !c.explanation) || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex >= q.choices.length) throw new Error("Invalid question");
    }
    if (lesson.optionalAction.requiresSpending !== false || lesson.optionalAction.maySkip !== true) throw new Error("Learning must not require spending");
    if (data.publicationGate.publishable && (!lesson.independentReviewedAt || lesson.status !== "published")) throw new Error("Unreviewed lessons cannot be published");
  }
  return data;
}
export function gradeQuiz(lesson: Lesson, answers: number[]) {
  if (answers.length !== lesson.questions.length || Array.from(answers).some((a,i) => !Number.isInteger(a) || a < 0 || a >= lesson.questions[i].choices.length)) throw new Error("Complete the quiz first");
  return { correct: answers.filter((answer,i) => answer === lesson.questions[i].correctIndex).length,
    total: lesson.questions.length, explanations: answers.map((answer,i) => lesson.questions[i].choices[answer].explanation) };
}
export type Completion = { owner: string; lessonId: string; version: number; xp: number; completedAt?: string; reviewedOffsets?: number[] };
export function recordCompletion(previous: Completion[], owner: string, lessonId: string, version: number): Completion[] {
  if (!owner || !lessonId || !Number.isSafeInteger(version) || version < 1) throw new Error("Invalid completion identity");
  if (previous.some(row => row.owner === owner && row.lessonId === lessonId && row.version === version)) return [...previous];
  return [...previous, { owner, lessonId, version, xp: 20 }];
}
export const curriculum = validateCurriculum(source);
const englishCurriculum = validateCurriculum(englishSource);
export function curriculumForLanguage(language: string): Curriculum {
  return language.split(/[-_]/)[0].toLowerCase() === "en" ? englishCurriculum : curriculum;
}
