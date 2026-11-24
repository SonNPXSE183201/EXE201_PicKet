import { notFound } from "next/navigation";
import { LearningHome } from "@/features/learning/learning-home";
import { WebLessonPlayer } from "@/features/learning/lesson-player";
import { lessonPack, lessonSummaries, orderedLessons } from "@/features/learning/lesson-pack";
import { learningEnabled } from "@/features/learning/web-progress";
import "@/features/learning/learning.css";

export default async function LearningPage({ searchParams }: { searchParams: Promise<{ lesson?: string }> }) {
  if (!learningEnabled) notFound();
  const query = await searchParams;
  const lessons = orderedLessons();
  const order = lessons.map((lesson) => lesson.lessonId);
  const lesson = query.lesson ? lessons.find((row) => row.lessonId === query.lesson) : undefined;
  if (query.lesson && !lesson) notFound();

  if (lesson) {
    return (
      <div className="learning-player-shell">
        <WebLessonPlayer key={lesson.lessonId} lesson={lesson} order={order} />
      </div>
    );
  }

  return (
    <div className="learning-page">
      <header className="learning-page-head">
        <h1>Học tài chính</h1>
        <p>30 bài ngắn, học ngay trên máy</p>
      </header>
      <LearningHome lessons={lessonSummaries()} stages={lessonPack.stages} />
      <p className="learning-footer-note">
        Nội dung giáo dục tham khảo, không phải tư vấn tài chính cá nhân.
      </p>
    </div>
  );
}
