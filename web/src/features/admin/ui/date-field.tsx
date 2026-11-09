"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AdminIcon } from "./admin-icon";

/* Paper-styled replacement for <input type="date|datetime-local">. Submits the
   same value format as the native input through a hidden field, so server
   actions and GET filters are unchanged. */
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parse(value: string | undefined, withTime: boolean) {
  const m = /^(\d{4})-(\d\d)-(\d\d)(?:T(\d\d):(\d\d))?/.exec(value ?? "");
  if (!m) return null;
  return { date: new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), hour: withTime ? Number(m[4] ?? 0) : 0, minute: withTime ? Number(m[5] ?? 0) : 0 };
}

export function DateField({ name, type = "date", defaultValue, required, placeholder, disabled }: {
  name: string; type?: "date" | "datetime-local"; defaultValue?: string | null; required?: boolean; placeholder?: string; disabled?: boolean;
}) {
  const withTime = type === "datetime-local";
  const initial = parse(defaultValue ?? undefined, withTime);
  const [selected, setSelected] = useState<Date | null>(initial?.date ?? null);
  const [hour, setHour] = useState(initial?.hour ?? 0);
  const [minute, setMinute] = useState(initial?.minute ?? 0);
  const [view, setView] = useState(() => { const d = initial?.date ?? new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();

  const value = selected ? `${iso(selected)}${withTime ? `T${pad(hour)}:${pad(minute)}` : ""}` : "";
  const label = selected ? `${pad(selected.getDate())}/${pad(selected.getMonth() + 1)}/${selected.getFullYear()}${withTime ? ` ${pad(hour)}:${pad(minute)}` : ""}` : "";

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (e.target instanceof Node && !root.current?.contains(e.target)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLButtonElement>(".ap-date-trigger")?.focus(); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>('[data-focus="true"]')?.focus());
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", key); };
  }, [open]);

  const days = useMemo(() => {
    const start = new Date(view);
    start.setDate(1 - ((view.getDay() + 6) % 7)); // Monday first
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [view]);
  const today = iso(new Date());
  const focusKey = selected && selected.getMonth() === view.getMonth() ? iso(selected) : iso(new Date(view.getFullYear(), view.getMonth(), 1));

  const pick = (d: Date) => {
    setSelected(d);
    if (d.getMonth() !== view.getMonth()) setView(new Date(d.getFullYear(), d.getMonth(), 1));
    if (!withTime) setOpen(false);
  };
  const moveFocus = (from: Date, delta: number) => {
    const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + delta);
    if (next.getMonth() !== view.getMonth()) setView(new Date(next.getFullYear(), next.getMonth(), 1));
    requestAnimationFrame(() => grid.current?.querySelector<HTMLButtonElement>(`[data-day="${iso(next)}"]`)?.focus());
  };

  return (
    <div className="ap-date" ref={root}>
      <input type="hidden" name={name} value={value} />
      <button type="button" className="ap-input ap-date-trigger" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span className={label ? undefined : "is-placeholder"}>{label || placeholder || (withTime ? "dd/mm/yyyy --:--" : "dd/mm/yyyy")}</span>
        <AdminIcon name="calendar" size={16} />
      </button>
      {required && <input className="ap-date-required" tabIndex={-1} aria-hidden="true" value={value} onChange={() => undefined} required />}
      {open && (
        // Inside a <label>, clicks on empty popover space would re-trigger the toggle button.
        <div className="ap-date-pop" id={id} role="dialog" aria-label="Chọn ngày"
          onClick={(e) => { if (!(e.target as HTMLElement).closest("button, select, option")) e.preventDefault(); }}>
          <div className="ap-date-head">
            <button type="button" className="ap-date-nav" aria-label="Tháng trước" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}><AdminIcon name="chevron-left" size={16} /></button>
            <b>Tháng {view.getMonth() + 1}, {view.getFullYear()}</b>
            <button type="button" className="ap-date-nav" aria-label="Tháng sau" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}><AdminIcon name="chevron-right" size={16} /></button>
          </div>
          <div className="ap-date-grid" ref={grid} role="grid">
            {WEEKDAYS.map((w) => <span key={w} className="ap-date-dow" role="columnheader">{w}</span>)}
            {days.map((d) => {
              const key = iso(d);
              const outside = d.getMonth() !== view.getMonth();
              return (
                <button key={key} type="button" data-day={key} data-focus={key === focusKey} tabIndex={key === focusKey ? 0 : -1}
                  className={`ap-date-day${outside ? " is-outside" : ""}${key === today ? " is-today" : ""}`}
                  aria-pressed={selected ? key === iso(selected) : false} aria-label={`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`}
                  onClick={() => pick(d)}
                  onKeyDown={(e) => {
                    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
                    if (step) { e.preventDefault(); moveFocus(d, step); }
                  }}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          {withTime && (
            <div className="ap-date-time">
              <AdminIcon name="calendar" size={14} />
              <label><span className="ap-sr">Giờ</span><select value={hour} onChange={(e) => setHour(Number(e.target.value))}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{pad(h)}</option>)}</select></label>
              <b>:</b>
              <label><span className="ap-sr">Phút</span><select value={minute} onChange={(e) => setMinute(Number(e.target.value))}>{Array.from({ length: 60 }, (_, m) => <option key={m} value={m}>{pad(m)}</option>)}</select></label>
            </div>
          )}
          <div className="ap-date-foot">
            <button type="button" className="ap-btn is-ghost is-sm" onClick={() => { setSelected(null); setOpen(false); }}>Xoá</button>
            <button type="button" className="ap-btn is-secondary is-sm" onClick={() => { const t = new Date(); setView(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(new Date(t.getFullYear(), t.getMonth(), t.getDate())); if (withTime) { setHour(t.getHours()); setMinute(t.getMinutes()); } }}>Hôm nay</button>
            {withTime && <button type="button" className="ap-btn is-sm" onClick={() => setOpen(false)}>Xong</button>}
          </div>
        </div>
      )}
    </div>
  );
}
