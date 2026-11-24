import { parseLessonBlocksPack, type BlockLesson, type LessonBlocksPack } from "@picket/domain";
import viPack from "./content/lesson-blocks.vi.v2.json";
import enPack from "./content/lesson-blocks.en.v2.json";
import { curriculum, curriculumForLanguage, type Curriculum } from "./curriculum";

/**
 * A block pack is only usable if it mirrors its v1 curriculum exactly: same
 * lesson ids, versions and quiz answer keys. Stored progress, drafts and cloud
 * grading are keyed on those values.
 */
export function assertPackMatchesCurriculum(pack: LessonBlocksPack, source: Curriculum): LessonBlocksPack {
  if (pack.lessons.length !== source.lessons.length) throw new Error("Lesson blocks do not match the curriculum");
  pack.lessons.forEach((lesson, i) => {
    const original = source.lessons[i];
    if (lesson.lessonId !== original.lessonId || lesson.version !== original.version) throw new Error(`Lesson ${lesson.lessonId} changed identity`);
    const quizzes = lesson.blocks.filter(block => block.type === "quiz");
    if (quizzes.length !== original.questions.length ||
        quizzes.some(block => block.type === "quiz" && block.correctIndex !== original.questions[block.questionIndex]?.correctIndex)) {
      throw new Error(`Lesson ${lesson.lessonId} changed its answer key`);
    }
  });
  return pack;
}

const vi = assertPackMatchesCurriculum(parseLessonBlocksPack(viPack), curriculum);
const en = assertPackMatchesCurriculum(parseLessonBlocksPack(enPack), curriculumForLanguage("en"));

export function lessonBlocksForLanguage(language: string): LessonBlocksPack {
  return language.split(/[-_]/)[0].toLowerCase() === "en" ? en : vi;
}

/** Lessons in path order (stage order, then the order listed inside each stage). */
export function orderedLessons(pack: LessonBlocksPack): BlockLesson[] {
  if (!pack.stages.length) return pack.lessons;
  const byId = new Map(pack.lessons.map(lesson => [lesson.lessonId, lesson]));
  return [...pack.stages].sort((a, b) => a.order - b.order)
    .flatMap(stage => stage.lessonIds.map(id => byId.get(id)).filter((lesson): lesson is BlockLesson => !!lesson));
}
