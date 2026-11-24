"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  blockAnswered, coarseEstimateStep, estimateIsClose, formatVnd, initialEstimate, lessonPathStates, quizBlocks, scoreLessonQuiz,
  type BlockLesson, type LessonAnswers, type LessonBlock, type LessonEstimateBlock, type LessonMythBlock, type LessonQuizBlock,
} from "@picket/domain";
import { Icon } from "@/core/ui/workspace-icon";
import { markWebLessonDone } from "./web-progress";

const label = { objective: "Mục tiêu bài học", concept: "Ý chính", summary: "Ghi nhớ" } as const;

/** Card session player for the web: one block at a time in a centred column. */
export function WebLessonPlayer({ lesson, order }: { lesson: BlockLesson; order: string[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<LessonAnswers>({});
  const [finished, setFinished] = useState<string | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const known = useMemo(() => new Set(order), [order]);
  const block = lesson.blocks[index];
  const last = index === lesson.blocks.length - 1;
  const ready = blockAnswered(block, answers);
  useEffect(() => { heading.current?.focus(); }, [index, finished]);
  const answer = (id: string, value: number) => setAnswers((old) => (old[id] === undefined ? { ...old, [id]: value } : old));
  function advance() {
    if (!ready) return;
    if (!last) { setIndex(index + 1); return; }
    const completed = markWebLessonDone(lesson.lessonId, known);
    const next = [...lessonPathStates(order, new Set(completed))].find(([, state]) => state === "current")?.[0] ?? "";
    setFinished(next);
  }
  if (finished !== null) {
    const score = scoreLessonQuiz(lesson, answers);
    return (
      <section className="learning-complete finance-panel" aria-labelledby="learning-complete-title">
        <div ref={heading} tabIndex={-1} className="learning-complete-head">
          <Image src="/admin-paper/money-bloom-scene-v1.webp" alt="" width={140} height={140} />
          <h1 id="learning-complete-title" role="status">Hoàn thành bài học!</h1>
          <p className="learning-muted">{lesson.title}</p>
        </div>
        <div className="learning-stats">
          <div><strong>{score.correct}/{score.total}</strong><span>câu đúng</span></div>
          <div><strong>{order.indexOf(lesson.lessonId) + 1}/{order.length}</strong><span>vị trí trong lộ trình</span></div>
        </div>
        <p className="learning-caption">Tiến độ trên web chỉ lưu trong trình duyệt này. XP được ghi nhận khi học trên ứng dụng Android.</p>
        <div className="learning-panel-soft">
          <p className="learning-overline">Thử áp dụng (không bắt buộc)</p>
          <p>{lesson.optionalAction}</p>
        </div>
        <details className="learning-sources">
          <summary>Nguồn tham khảo</summary>
          <ul>{lesson.sources.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer noopener">{url}</a></li>)}</ul>
        </details>
        <div className="learning-actions">
          {finished ? <Link className="button primary learning-cta" href={`/learning?lesson=${encodeURIComponent(finished)}`}>Bài tiếp theo</Link> : null}
          <Link className="button secondary learning-cta" href="/learning">Về lộ trình</Link>
        </div>
      </section>
    );
  }
  return (
    <section className="learning-player" aria-label={lesson.title}>
      <div className="learning-player-top">
        <Link className="icon-action learning-icon" href="/learning" aria-label="Thoát bài học"><Icon name="close" /></Link>
        <div className="learning-segments" role="progressbar" aria-label={`Thẻ ${index + 1} trên ${lesson.blocks.length}`}
          aria-valuemin={1} aria-valuemax={lesson.blocks.length} aria-valuenow={index + 1}>
          {lesson.blocks.map((row, i) => <span key={row.id} className={i <= index ? "is-on" : undefined} />)}
        </div>
        <button type="button" className="icon-action learning-icon" aria-label="Thẻ trước" disabled={index === 0} onClick={() => setIndex(Math.max(0, index - 1))}>
          <Icon name="arrowLeft" />
        </button>
      </div>
      <div ref={heading} tabIndex={-1} className="learning-player-body">
        <p className="learning-caption">{lesson.title}</p>
        <BlockView key={block.id} block={block} lesson={lesson} answers={answers} onAnswer={answer} />
      </div>
      <div className="learning-player-cta">
        <button type="button" className="button primary learning-cta" disabled={!ready} onClick={advance}>{last ? "Hoàn thành bài" : "Tiếp tục"}</button>
      </div>
    </section>
  );
}

function BlockView({ block, lesson, answers, onAnswer }: { block: LessonBlock; lesson: BlockLesson; answers: LessonAnswers; onAnswer(id: string, value: number): void }) {
  switch (block.type) {
    case "card":
      return (
        <article className={`learning-card finance-panel${block.kind === "summary" ? " is-summary" : ""}`}>
          <p className="learning-overline">{label[block.kind]}</p>
          {block.text ? (block.kind === "objective" ? <h1>{block.text}</h1> : <p className="learning-card-text">{block.text}</p>) : null}
          {block.points ? <ul className="learning-points">{block.points.map((point) => <li key={point}><Icon name="check" /><span>{point}</span></li>)}</ul> : null}
        </article>
      );
    case "myth": return <MythView block={block} answer={answers[block.id]} onAnswer={onAnswer} />;
    case "quiz": {
      const quizzes = quizBlocks(lesson);
      return <QuizView block={block} number={quizzes.indexOf(block) + 1} total={quizzes.length} answer={answers[block.id]} onAnswer={onAnswer} />;
    }
    case "estimate": return <EstimateView block={block} answer={answers[block.id]} onAnswer={onAnswer} />;
  }
}

function Choices({ legend, options, answer, correct, onChoose }: { legend: string; options: string[]; answer?: number; correct: number; onChoose(value: number): void }) {
  const done = answer !== undefined;
  return (
    <div role="radiogroup" aria-label={legend} className="learning-choices">
      {options.map((text, value) => {
        const state = !done ? "" : value === correct ? " is-right" : answer === value ? " is-wrong" : " is-dimmed";
        return (
          <button key={value} type="button" role="radio" aria-checked={answer === value} disabled={done} className={`learning-choice${state}`} onClick={() => onChoose(value)}>
            <span>{text}</span>
            {done && value === correct ? <Icon name="check" /> : done && answer === value ? <Icon name="close" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function Feedback({ right, title, body }: { right: boolean; title: string; body: string }) {
  return (
    <div className={`learning-feedback${right ? " is-right" : ""}`} role="status" aria-live="polite">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function MythView({ block, answer, onAnswer }: { block: LessonMythBlock; answer?: number; onAnswer(id: string, value: number): void }) {
  const correct = block.answer === "myth" ? 0 : 1;
  const right = answer === correct;
  return (
    <div className="learning-stack">
      <article className="learning-card finance-panel">
        <p className="learning-overline">Hiểu lầm hay sự thật?</p>
        <h1>“{block.statement}”</h1>
      </article>
      <Choices legend="Hiểu lầm hay sự thật?" options={["Hiểu lầm", "Sự thật"]} answer={answer} correct={correct} onChoose={(value) => onAnswer(block.id, value)} />
      {answer !== undefined ? <Feedback right={right} title={right ? "Chính xác, đây là hiểu lầm thường gặp." : "Chưa đúng, đây là hiểu lầm thường gặp."} body={`Điều nên nhớ: ${block.explanation}`} /> : null}
    </div>
  );
}

function QuizView({ block, number, total, answer, onAnswer }: { block: LessonQuizBlock; number: number; total: number; answer?: number; onAnswer(id: string, value: number): void }) {
  const right = answer === block.correctIndex;
  const correct = block.choices[block.correctIndex];
  return (
    <div className="learning-stack">
      <article className="learning-card finance-panel">
        <p className="learning-overline">Câu hỏi {number}/{total}</p>
        <h1>{block.prompt}</h1>
        {answer === undefined ? <p className="learning-caption">Chọn một đáp án để xem giải thích ngay.</p> : null}
      </article>
      <Choices legend={block.prompt} options={block.choices.map((choice) => choice.text)} answer={answer} correct={block.correctIndex} onChoose={(value) => onAnswer(block.id, value)} />
      {answer !== undefined ? (
        <Feedback right={right} title={right ? "Chính xác!" : "Chưa đúng."}
          body={right ? correct.explanation : `${block.choices[answer].explanation} Đáp án đúng: ${correct.text}. ${correct.explanation}`} />
      ) : null}
    </div>
  );
}

function EstimateView({ block, answer, onAnswer }: { block: LessonEstimateBlock; answer?: number; onAnswer(id: string, value: number): void }) {
  const [guess, setGuess] = useState(() => answer ?? initialEstimate(block));
  const done = answer !== undefined;
  const value = done ? answer : guess;
  const close = done && estimateIsClose(block, answer);
  const coarse = coarseEstimateStep(block.min, block.max, block.step);
  return (
    <div className="learning-stack">
      <article className="learning-card finance-panel">
        <p className="learning-overline">Đoán trước khi học</p>
        <h1 id={`${block.id}-prompt`}>{block.prompt}</h1>
        <output className="learning-guess" htmlFor={`${block.id}-range`} aria-live="polite">Bạn đoán {formatVnd(value)}</output>
        <div className="learning-range-row">
          <button type="button" className="icon-action learning-icon" aria-label="Giảm" disabled={done || value <= block.min}
            onClick={() => setGuess(Math.max(block.min, value - coarse))}><Icon name="minus" /></button>
          <input id={`${block.id}-range`} type="range" min={block.min} max={block.max} step={block.step} value={value} disabled={done}
            aria-labelledby={`${block.id}-prompt`} aria-valuetext={formatVnd(value)} onChange={(event) => setGuess(Number(event.target.value))} />
          <button type="button" className="icon-action learning-icon" aria-label="Tăng" disabled={done || value >= block.max}
            onClick={() => setGuess(Math.min(block.max, value + coarse))}><Icon name="plus" /></button>
        </div>
        <div className="learning-range-ends"><span>{formatVnd(block.min)}</span><span>{formatVnd(block.max)}</span></div>
      </article>
      {done ? (
        <Feedback right={close} title={`${close ? "Rất gần! " : ""}Đáp án là ${formatVnd(block.answer)}.`} body={block.explanation} />
      ) : (
        <button type="button" className="button secondary learning-cta" onClick={() => onAnswer(block.id, guess)}>Xem đáp án</button>
      )}
    </div>
  );
}
