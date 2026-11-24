"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { lessonPathStates, type BlockStage } from "@picket/domain";
import { Icon } from "@/core/ui/workspace-icon";
import type { LessonSummary } from "./lesson-pack";
import { WEB_LEARNING_STORAGE_KEY, parseWebLearningProgress } from "./web-progress";

const stateLabel = {
  done: "Đã xong",
  current: "Bài tiếp theo",
  locked: "Chưa mở, hãy học xong bài trước",
} as const;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}
function readRaw() {
  try { return window.localStorage.getItem(WEB_LEARNING_STORAGE_KEY); } catch { return null; }
}

export function LearningHome({ lessons, stages }: { lessons: LessonSummary[]; stages: BlockStage[] }) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const known = useMemo(() => new Set(lessons.map((lesson) => lesson.lessonId)), [lessons]);
  const completed = useMemo(() => new Set(parseWebLearningProgress(raw, known)), [raw, known]);
  const states = lessonPathStates(lessons.map((lesson) => lesson.lessonId), completed);
  const today = lessons.find((lesson) => states.get(lesson.lessonId) === "current");
  const byId = new Map(lessons.map((lesson) => [lesson.lessonId, lesson]));
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);
  const visibleIds = sortedStages.flatMap((row) => row.lessonIds.filter((id) => byId.has(id)));
  const finalLessonId = visibleIds[visibleIds.length - 1];
  const done = completed.size;
  const ratio = lessons.length ? Math.min(100, (done / lessons.length) * 100) : 0;

  const milestones = [
    { id: "firstLesson", label: "Hoàn thành bài đầu tiên", done: done >= 1 },
    { id: "threeLessons", label: "Hoàn thành ba bài", done: done >= 3 },
    { id: "allLessons", label: "Hoàn thành mọi bài học", done: lessons.length > 0 && done >= lessons.length },
  ];

  return (
    <div className="learning-grid">
      <div className="learning-main">
        <section className="learning-hero" aria-labelledby="learning-today-title">
          <Image
            src="/admin-paper/money-bloom-scene-v1.webp"
            alt=""
            width={88}
            height={88}
            className="learning-hero-art"
          />
          <div className="learning-hero-copy">
            <span className="learning-hero-overline">
              {today ? "BÀI HÔM NAY" : "BẠN ĐÃ HỌC XONG CẢ LỘ TRÌNH"}
            </span>
            {today ? (
              <>
                <h2 id="learning-today-title">{today.title}</h2>
                <p className="learning-hero-meta">Khoảng {today.minutes} phút</p>
              </>
            ) : (
              <p id="learning-today-title" className="learning-hero-meta">
                Có thể học lại bất kỳ bài nào để ôn.
              </p>
            )}
          </div>
          {today ? (
            <Link
              className="learning-hero-btn"
              href={`/learning?lesson=${encodeURIComponent(today.lessonId)}`}
            >
              Bắt đầu học
            </Link>
          ) : null}
        </section>

        <section className="learning-progress-mobile" aria-label="Tiến độ lộ trình">
          <div className="learning-progress-row">
            <strong>{done}/{lessons.length} bài đã xong</strong>
            <span className="learning-chip is-neutral is-medium">Lưu trên trình duyệt</span>
          </div>
          <div
            className="learning-progress"
            role="progressbar"
            aria-label="Tiến độ lộ trình"
            aria-valuemin={0}
            aria-valuemax={lessons.length}
            aria-valuenow={done}
          >
            <span style={{ width: `${ratio}%` }} />
          </div>
        </section>

        <section className="learning-path" aria-label="Lộ trình học tài chính">
          {sortedStages.map((row) => (
            <div key={row.stageId} className="learning-stage">
              <div className="learning-stage-head">
                <p className="learning-overline">CHẶNG {row.order}</p>
                <h3>{row.title}</h3>
              </div>
              <ol className="learning-rail-list">
                {row.lessonIds.map((id) => {
                  const lesson = byId.get(id);
                  if (!lesson) return null;
                  const state = states.get(id) ?? "locked";
                  const isOverallLast = id === finalLessonId;
                  const meta = state === "locked"
                    ? stateLabel.locked
                    : `${lesson.minutes} phút · ${lesson.kind === "practice" ? "Thực hành" : "Cơ bản"}`;
                  const cardContent = (
                    <>
                      <strong className="learning-row-title">{lesson.title}</strong>
                      <span className="learning-row-meta">{meta}</span>
                      {state === "done" ? <span className="learning-chip is-success">Đã xong</span> : null}
                      {state === "current" ? <span className="learning-chip is-neutral is-medium">Bài tiếp theo</span> : null}
                    </>
                  );

                  return (
                    <li key={id} className={`learning-row is-${state}`}>
                      <div className="learning-rail-col" aria-hidden="true">
                        <span className={`learning-node is-${state}`}>
                          <Icon name={state === "done" ? "check" : state === "locked" ? "lock" : "chevronRight"} />
                        </span>
                        {!isOverallLast ? (
                          <span className={`learning-rail-line${state === "done" ? " is-done" : ""}`} />
                        ) : null}
                      </div>
                      {state === "locked" ? (
                        <div className="learning-row-card" aria-disabled="true">
                          {cardContent}
                        </div>
                      ) : (
                        <Link
                          className="learning-row-card"
                          href={`/learning?lesson=${encodeURIComponent(id)}`}
                          aria-current={state === "current" ? "step" : undefined}
                        >
                          {cardContent}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </section>
      </div>

      <aside className="learning-aside" aria-label="Tiến độ và dấu mốc học tập">
        <section className="learning-aside-card learning-progress-desktop" aria-labelledby="learning-aside-progress">
          <p className="learning-overline">LỘ TRÌNH CỦA BẠN</p>
          <h2 id="learning-aside-progress" className="learning-aside-title">
            {done}/{lessons.length} bài đã xong
          </h2>
          <div
            className="learning-progress"
            role="progressbar"
            aria-label="Tiến độ lộ trình"
            aria-valuemin={0}
            aria-valuemax={lessons.length}
            aria-valuenow={done}
          >
            <span style={{ width: `${ratio}%` }} />
          </div>
          <span className="learning-chip is-neutral is-medium">Lưu trên trình duyệt</span>
        </section>

        <section className="learning-aside-card" aria-labelledby="learning-aside-milestones">
          <p id="learning-aside-milestones" className="learning-overline">DẤU MỐC HỌC TẬP</p>
          <ul className="learning-milestones">
            {milestones.map((item) => (
              <li key={item.id} className={`learning-milestone${item.done ? " is-done" : ""}`}>
                <span className="learning-milestone-icon" aria-hidden="true">
                  <Icon name={item.done ? "check" : "lock"} />
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
          <p className="learning-micro">
            XP và dấu mốc chỉ ghi nhận học tập, không quy đổi thành tiền hay quyền lợi gói.
          </p>
        </section>
      </aside>
    </div>
  );
}
