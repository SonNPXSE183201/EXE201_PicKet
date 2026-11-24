"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { lessonPathStates, type BlockStage } from "@picket/domain";
import { Icon } from "@/core/ui/workspace-icon";
import type { LessonSummary } from "./lesson-pack";
import { WEB_LEARNING_STORAGE_KEY, parseWebLearningProgress } from "./web-progress";

const stateLabel = { done: "Đã xong", current: "Bài tiếp theo", locked: "Chưa mở, hãy học xong bài trước" } as const;

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
  const done = completed.size;
  const stage = stages.find((row) => row.stageId === today?.stageId);
  return (
    <>
      <section className="learning-today finance-panel" aria-labelledby="learning-today-title">
        <div className="learning-today-meta">
          <span className="learning-overline">{today ? "Bài hôm nay" : "Bạn đã học xong cả lộ trình"}</span>
          <span>{done}/{lessons.length} bài đã xong</span>
        </div>
        <div className="learning-progress" role="progressbar" aria-label="Tiến độ lộ trình" aria-valuemin={0} aria-valuemax={lessons.length} aria-valuenow={done}>
          <span style={{ width: `${lessons.length ? (done / lessons.length) * 100 : 0}%` }} />
        </div>
        {today ? (
          <>
            <div className="learning-today-title">
              <div>
                {stage ? <p className="learning-muted">Chặng {stage.order} · {stage.title}</p> : null}
                <h2 id="learning-today-title">{today.number}. {today.title}</h2>
              </div>
              <Image src="/paper/category-education-v1.png" alt="" width={72} height={72} />
            </div>
            <p className="learning-muted">{today.objective}</p>
            <p className="learning-caption">Khoảng {today.minutes} phút</p>
            <Link className="button primary learning-cta" href={`/learning?lesson=${encodeURIComponent(today.lessonId)}`}>Bắt đầu học</Link>
          </>
        ) : (
          <p id="learning-today-title" className="learning-muted">Có thể học lại bất kỳ bài nào để ôn.</p>
        )}
      </section>
      <section className="learning-path" aria-labelledby="learning-path-title">
        <h2 id="learning-path-title">Lộ trình</h2>
        {[...stages].sort((a, b) => a.order - b.order).map((row) => (
          <div key={row.stageId} className="learning-stage">
            <p className="learning-overline">Chặng {row.order}</p>
            <h3>{row.title}</h3>
            <ol>
              {row.lessonIds.map((id) => {
                const lesson = byId.get(id);
                if (!lesson) return null;
                const state = states.get(id) ?? "locked";
                const body = (
                  <>
                    <span className={`learning-node is-${state}`} aria-hidden="true">
                      <Icon name={state === "done" ? "check" : state === "locked" ? "lock" : "book"} />
                    </span>
                    <span className="learning-row-text">
                      <strong>{lesson.number}. {lesson.title}</strong>
                      <span>{stateLabel[state]}</span>
                    </span>
                  </>
                );
                return (
                  <li key={id} className={`learning-row is-${state}`}>
                    {state === "locked" ? (
                      <div className="learning-row-inner" aria-disabled="true">{body}</div>
                    ) : (
                      <Link className="learning-row-inner" href={`/learning?lesson=${encodeURIComponent(id)}`} aria-current={state === "current" ? "step" : undefined}>
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>
    </>
  );
}
