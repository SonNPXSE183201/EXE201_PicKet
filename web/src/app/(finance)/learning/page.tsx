import { notFound } from "next/navigation";
import { LearningHome } from "@/features/learning/learning-home";
import { WebLessonPlayer } from "@/features/learning/lesson-player";
import { lessonPack, lessonSummaries, orderedLessons } from "@/features/learning/lesson-pack";
import { learningEnabled } from "@/features/learning/web-progress";
import { FinancePageHeader } from "../finance-ui";
import "@/features/learning/learning.css";

export default async function LearningPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  if (!learningEnabled) notFound();
  const query = await searchParams;
  const lessons = orderedLessons();
  const order = lessons.map((lesson) => lesson.lessonId);
  const lesson = query.lesson ? lessons.find((row) => row.lessonId === query.lesson) : undefined;
  if (query.lesson && !lesson) notFound();
  return (
    <div className="learning-column">
      {lesson ? (
        <WebLessonPlayer key={lesson.lessonId} lesson={lesson} order={order} />
      ) : (
        <>
          <FinancePageHeader
            title="Học tài chính"
            description="30 bài ngắn dạng thẻ. Nội dung giáo dục tham khảo, không phải tư vấn tài chính cá nhân."
          />
          <LearningHome lessons={lessonSummaries()} stages={lessonPack.stages} />
        </>
      )}
    </div>
  );
}
