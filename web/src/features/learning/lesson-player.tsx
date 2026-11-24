"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  blockAnswered, coarseEstimateStep, countWords, estimateIsClose, formatVnd, initialEstimate, lessonPathStates, quizBlocks, scoreLessonQuiz, snapEstimate,
  type BlockLesson, type LessonAnswers, type LessonBlock, type LessonEstimateBlock, type LessonMythBlock, type LessonQuizBlock,
} from "@picket/domain";
import { Icon } from "@/core/ui/workspace-icon";
import { markWebLessonDone } from "./web-progress";

const label = { objective: "Mục tiêu bài học", concept: "Ý chính", summary: "Ghi nhớ" } as const;

function readingSeconds(words: number) {
  return Math.max(5, Math.round((words / 2.4) / 5) * 5);
}

/** Card session player for the web: one block at a time in a centred column. */
export function WebLessonPlayer({ lesson, order }: { lesson: BlockLesson; order: string[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<LessonAnswers>({});
  const [estimateGuesses, setEstimateGuesses] = useState<Record<string, number>>({});
  const [exitOpen, setExitOpen] = useState(false);
  const [finished, setFinished] = useState<{ nextId: string; completedCount: number } | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const known = useMemo(() => new Set(order), [order]);
  const block = lesson.blocks[index];
  const total = lesson.blocks.length;
  const last = index === total - 1;
  const ready = blockAnswered(block, answers);
  const quizzes = useMemo(() => quizBlocks(lesson), [lesson]);
  const quizNumber = block.type === "quiz" ? quizzes.indexOf(block) + 1 : 0;
  const progressLabel = block.type === "quiz"
    ? `Câu hỏi ${quizNumber}/${quizzes.length} · Thẻ ${index + 1} trên ${total}`
    : `Thẻ ${index + 1} trên ${total}`;

  useEffect(() => { heading.current?.focus(); }, [index, finished]);

  useEffect(() => {
    if (!exitOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExitOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [exitOpen]);

  const answer = (id: string, value: number) =>
    setAnswers((old) => (old[id] === undefined ? { ...old, [id]: value } : old));

  function advance() {
    if (!ready) return;
    if (!last) { setIndex(index + 1); return; }
    const completed = markWebLessonDone(lesson.lessonId, known);
    const nextId = [...lessonPathStates(order, new Set(completed))].find(([, state]) => state === "current")?.[0] ?? "";
    setFinished({ nextId, completedCount: completed.length });
  }

  if (finished !== null) {
    const score = scoreLessonQuiz(lesson, answers);
    return (
      <section className="learning-complete" aria-labelledby="learning-complete-title">
        <div ref={heading} tabIndex={-1} className="learning-complete-head">
          <Image src="/admin-paper/money-bloom-scene-v1.webp" alt="" width={140} height={140} />
          <h1 id="learning-complete-title" role="status">Hoàn thành bài học!</h1>
          {score.total > 0 ? <p className="learning-complete-score">Đúng {score.correct}/{score.total} câu hỏi</p> : null}
        </div>

        <div className="learning-stats">
          <div className="learning-stat-card">
            <strong>{finished.completedCount}/{order.length}</strong>
            <span>bài đã xong</span>
          </div>
          <div className="learning-stat-card">
            <strong>{score.correct}/{score.total}</strong>
            <span>câu đúng</span>
          </div>
        </div>

        <WebNotice
          tone="info"
          title="XP chỉ ghi nhận học tập"
          body="Tiến độ trên web chỉ lưu trong trình duyệt này. XP và dấu mốc không quy đổi thành tiền hay quyền lợi gói. Bạn không cần chi tiền thật hay duy trì chuỗi ngày."
        />

        <div className="learning-remember">
          <p className="learning-overline">THỬ ÁP DỤNG (KHÔNG BẮT BUỘC)</p>
          <p className="learning-remember-body">{lesson.optionalAction}</p>
        </div>

        {lesson.sources.length > 0 ? (
          <details className="learning-sources">
            <summary>Nguồn tham khảo</summary>
            <ul>
              {lesson.sources.map((url) => (
                <li key={url}><a href={url} target="_blank" rel="noreferrer noopener">{url}</a></li>
              ))}
            </ul>
          </details>
        ) : null}

        <div className="learning-action-bar">
          {finished.nextId ? (
            <>
              <Link className="button primary learning-cta" href={`/learning?lesson=${encodeURIComponent(finished.nextId)}`}>
                Bài tiếp theo
              </Link>
              <Link className="learning-text-btn" href="/learning">Về lộ trình</Link>
            </>
          ) : (
            <Link className="button primary learning-cta" href="/learning">Về lộ trình</Link>
          )}
        </div>
      </section>
    );
  }

  const estimatePending = block.type === "estimate" && !ready;
  const estimateValue = block.type === "estimate" ? (estimateGuesses[block.id] ?? initialEstimate(block)) : 0;

  return (
    <section className="learning-player" aria-label={lesson.title}>
      <div className="learning-player-top">
        <button
          type="button"
          className="learning-icon"
          aria-label="Thoát bài học"
          onClick={() => setExitOpen(true)}
        >
          <Icon name="close" />
        </button>
        <div className="learning-header-progress">
          <div
            className="learning-progress"
            role="progressbar"
            aria-label={progressLabel}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
          >
            <span style={{ width: `${((index + 1) / total) * 100}%` }} />
          </div>
          <p className="learning-micro">{progressLabel}</p>
        </div>
      </div>

      <div ref={heading} tabIndex={-1} className="learning-player-body">
        <BlockView
          key={block.id}
          block={block}
          lesson={lesson}
          quizNumber={quizNumber}
          quizTotal={quizzes.length}
          answers={answers}
          estimateGuess={estimateValue}
          onAnswer={answer}
          onEstimateGuessChange={(id, value) => setEstimateGuesses((prev) => ({ ...prev, [id]: value }))}
        />
      </div>

      <div className="learning-player-cta">
        <button
          type="button"
          className="button primary learning-cta"
          disabled={!estimatePending && !ready}
          onClick={() => {
            if (estimatePending) answer(block.id, estimateValue);
            else advance();
          }}
        >
          {estimatePending ? "Xem đáp án" : last ? "Hoàn thành bài" : "Tiếp tục"}
        </button>
        {index > 0 ? (
          <button
            type="button"
            className="learning-text-btn"
            onClick={() => setIndex(Math.max(0, index - 1))}
          >
            Thẻ trước
          </button>
        ) : null}
      </div>

      {exitOpen ? (
        <div
          className="learning-dialog-overlay"
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) setExitOpen(false); }}
        >
          <div className="learning-dialog" role="dialog" aria-modal="true" aria-labelledby="learning-exit-title">
            <h2 id="learning-exit-title">Thoát bài học?</h2>
            <p>
              Tiến trình của bài này được giữ lại, bạn có thể học tiếp bất cứ lúc nào. Điểm XP chỉ tính khi hoàn thành bài.
            </p>
            <div className="learning-dialog-actions">
              <button type="button" className="learning-text-btn" onClick={() => setExitOpen(false)}>
                Học tiếp
              </button>
              <button type="button" className="button primary learning-dialog-confirm" onClick={() => router.push("/learning")}>
                Thoát
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WebNotice({ tone, title, body }: { tone: "success" | "warning" | "info"; title: string; body: string }) {
  const icon = tone === "success" ? "check" : tone === "warning" ? "alert" : "sparkle";
  return (
    <div className={`learning-notice is-${tone}`} role="status" aria-live="polite">
      <span className="learning-notice-tile" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <div className="learning-notice-copy">
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}

function BlockView({ block, lesson, quizNumber, quizTotal, answers, estimateGuess, onAnswer, onEstimateGuessChange }: {
  block: LessonBlock; lesson: BlockLesson; quizNumber: number; quizTotal: number;
  answers: LessonAnswers; estimateGuess: number;
  onAnswer(id: string, value: number): void;
  onEstimateGuessChange(id: string, value: number): void;
}) {
  switch (block.type) {
    case "card": {
      const words = countWords(block.text ?? "") + (block.points?.reduce((sum, point) => sum + countWords(point), 0) ?? 0);
      return (
        <article className="learning-card">
          <Image src="/admin-paper/save-jar-v1.webp" alt="" width={112} height={112} className="learning-card-art" />
          <p className="learning-overline">{label[block.kind]}</p>
          <h1>{lesson.title}</h1>
          {block.text ? <p className="learning-card-text">{block.text}</p> : null}
          {block.points ? (
            <ul className="learning-points">
              {block.points.map((point) => (
                <li key={point}><Icon name="check" /><span>{point}</span></li>
              ))}
            </ul>
          ) : null}
          {words > 0 ? <p className="learning-micro">{words} từ · đọc khoảng {readingSeconds(words)} giây</p> : null}
        </article>
      );
    }
    case "myth":
      return <MythView block={block} answer={answers[block.id]} onAnswer={onAnswer} />;
    case "quiz":
      return <QuizView block={block} number={quizNumber} total={quizTotal} answer={answers[block.id]} onAnswer={onAnswer} />;
    case "estimate":
      return (
        <EstimateView
          block={block}
          guess={estimateGuess}
          answer={answers[block.id]}
          onGuessChange={(value) => onEstimateGuessChange(block.id, value)}
        />
      );
  }
}

function MythView({ block, answer, onAnswer }: {
  block: LessonMythBlock; answer?: number; onAnswer(id: string, value: number): void;
}) {
  const correct = block.answer === "myth" ? 0 : 1;
  const done = answer !== undefined;
  const right = answer === correct;
  const options = ["Hiểu lầm", "Sự thật"];

  return (
    <div className="learning-stack">
      <article className="learning-card">
        <p className="learning-overline">HIỂU LẦM HAY SỰ THẬT?</p>
        <h1>{`"${block.statement}"`}</h1>
        <div role="radiogroup" aria-label="Hiểu lầm hay sự thật?" className="learning-myth-row">
          {options.map((text, value) => {
            const selected = answer === value;
            const dimmed = done && !selected;
            return (
              <button
                key={text}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={done}
                className={`learning-myth-btn${selected ? " is-selected" : ""}${dimmed ? " is-dimmed" : ""}`}
                onClick={() => onAnswer(block.id, value)}
              >
                {text}
              </button>
            );
          })}
        </div>
        {!done ? <p className="learning-hint">Chạm một lựa chọn để xem giải thích ngay.</p> : null}
      </article>

      {done ? (
        <>
          <WebNotice
            tone={right ? "success" : "warning"}
            title={right ? "Chính xác!" : "Chưa đúng."}
            body={right ? "Chính xác, đây là hiểu lầm thường gặp." : "Chưa đúng, đây là hiểu lầm thường gặp."}
          />
          <div className="learning-remember">
            <p className="learning-overline is-muted">ĐIỀU NÊN NHỚ</p>
            <p className="learning-remember-body">{block.explanation}</p>
          </div>
        </>
      ) : null}
    </div>
  );
}

function QuizView({ block, number, total, answer, onAnswer }: {
  block: LessonQuizBlock; number: number; total: number; answer?: number; onAnswer(id: string, value: number): void;
}) {
  const done = answer !== undefined;
  const right = answer === block.correctIndex;
  const correct = block.choices[block.correctIndex];

  return (
    <div className="learning-stack">
      <article className="learning-card">
        <p className="learning-overline">CÂU HỎI {number}/{total}</p>
        <h1>{block.prompt}</h1>
        <div role="radiogroup" aria-label={block.prompt} className="learning-choices">
          {block.choices.map((choice, value) => {
            const selected = answer === value;
            const isCorrect = value === block.correctIndex;
            const stateClass = !done ? "" : isCorrect ? " is-right" : selected ? " is-wrong" : "";
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={done}
                className={`learning-choice${stateClass}`}
                onClick={() => onAnswer(block.id, value)}
              >
                <span className={`learning-select-circle${selected ? " is-checked" : ""}`} aria-hidden="true">
                  {selected ? <Icon name="check" /> : null}
                </span>
                <span className="learning-choice-text">{choice.text}</span>
              </button>
            );
          })}
        </div>
        {!done ? <p className="learning-hint">Chọn một đáp án để xem giải thích ngay.</p> : null}
      </article>

      {done ? (
        <WebNotice
          tone={right ? "success" : "warning"}
          title={right ? "Chính xác!" : "Chưa đúng."}
          body={right ? block.choices[answer].explanation : `Đáp án đúng: ${correct.text}. ${block.choices[answer].explanation}`}
        />
      ) : null}
    </div>
  );
}

function EstimateView({ block, guess, answer, onGuessChange }: {
  block: LessonEstimateBlock; guess: number; answer?: number; onGuessChange(value: number): void;
}) {
  const done = answer !== undefined;
  const value = done ? answer : guess;
  const close = done && estimateIsClose(block, answer);
  const coarse = coarseEstimateStep(block.min, block.max, block.step);
  const answerPercent = block.max > block.min
    ? Math.min(100, Math.max(0, ((block.answer - block.min) / (block.max - block.min)) * 100))
    : 0;

  return (
    <div className="learning-stack">
      <article className="learning-card">
        <p className="learning-overline">ĐOÁN TRƯỚC KHI HỌC</p>
        <h1 id={`${block.id}-prompt`}>{block.prompt}</h1>
        <output className="learning-guess" htmlFor={`${block.id}-range`} aria-live="polite">
          Bạn đoán {formatVnd(value)}
        </output>
        <div className="learning-slider-wrap">
          <div className="learning-range-track-wrap">
            <input
              id={`${block.id}-range`}
              type="range"
              min={block.min}
              max={block.max}
              step={block.step}
              value={value}
              disabled={done}
              aria-labelledby={`${block.id}-prompt`}
              aria-valuetext={formatVnd(value)}
              onChange={(event) => onGuessChange(Number(event.target.value))}
            />
            {done ? (
              <span
                className="learning-answer-dot"
                style={{ left: `${answerPercent}%` }}
                aria-hidden="true"
              />
            ) : null}
          </div>
          <div className="learning-range-ends">
            <span>{formatVnd(block.min)}</span>
            <span>{formatVnd(block.max)}</span>
          </div>
        </div>
        {!done ? (
          <>
            <p className="learning-hint">Kéo thanh trượt hoặc dùng nút Giảm, Tăng để chọn số.</p>
            <div className="learning-estimate-actions">
              <button
                type="button"
                className="learning-outline-btn"
                disabled={value <= block.min}
                onClick={() => onGuessChange(snapEstimate(value - coarse, block.min, block.max, block.step))}
              >
                Giảm
              </button>
              <button
                type="button"
                className="learning-outline-btn"
                disabled={value >= block.max}
                onClick={() => onGuessChange(snapEstimate(value + coarse, block.min, block.max, block.step))}
              >
                Tăng
              </button>
            </div>
          </>
        ) : null}
      </article>

      {done ? (
        <WebNotice
          tone={close ? "success" : "info"}
          title={close ? "Rất gần!" : `Đáp án là ${formatVnd(block.answer)}.`}
          body={close ? `Đáp án là ${formatVnd(block.answer)}. ${block.explanation}` : block.explanation}
        />
      ) : null}
    </div>
  );
}
