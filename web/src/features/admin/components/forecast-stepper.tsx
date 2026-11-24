"use client";

import { useId, useRef, useState } from "react";

import { AdminIcon } from "../ui/admin-icon";

/** Number field with minus/plus buttons. Submits through a normal named input, so the server action is unchanged. */
export function ForecastStepper({ name, label, min, max, defaultValue, unit, hint }: { name: string; label: string; min: number; max: number; defaultValue: number; unit: string; hint: string }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(defaultValue);
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n)));
  // Uncontrolled input so the form's Cancel (reset) button restores the saved value.
  const write = (n: number) => { if (input.current) input.current.value = String(n); setCurrent(n); };
  const step = (delta: number) => write(clamp((Number(input.current?.value) || min) + delta));
  return (
    <div className="fs-field">
      <label className="fs-label" htmlFor={id}>{label}</label>
      <div className="fs-stepper">
        <button type="button" className="fs-step" aria-label={`Giảm ${label.toLowerCase()}`} onClick={() => step(-1)} disabled={current <= min}><AdminIcon name="minus" size={18} /></button>
        <span className="fs-value">
          <input id={id} name={name} type="number" inputMode="numeric" min={min} max={max} step={1} required ref={input} defaultValue={defaultValue} onChange={(event) => setCurrent(clamp(Number(event.target.value) || min))} onBlur={(event) => write(clamp(Number(event.target.value) || min))} aria-describedby={`${id}-hint`} />
          <span aria-hidden="true">{unit}</span>
        </span>
        <button type="button" className="fs-step" aria-label={`Tăng ${label.toLowerCase()}`} onClick={() => step(1)} disabled={current >= max}><AdminIcon name="plus" size={18} /></button>
        <small id={`${id}-hint`}>{hint}</small>
      </div>
    </div>
  );
}
