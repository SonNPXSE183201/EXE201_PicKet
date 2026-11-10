"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AdminIcon } from "../ui/admin-icon";

export function AdminDialog({ title, trigger, children, triggerClassName = "ap-btn is-secondary" }: {
  title: string;
  trigger: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) return;
    const manageDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])") ?? [])];
      const first = focusable[0], last = focusable.at(-1);
      if (!first || !last) { event.preventDefault(); dialogRef.current?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", manageDialogKeys);
    dialogRef.current?.querySelector<HTMLElement>("button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])")?.focus();
    return () => document.removeEventListener("keydown", manageDialogKeys);
  }, [open]);

  useEffect(() => {
    if (wasOpen.current && !open) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <button ref={triggerRef} type="button" className={triggerClassName} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        {trigger}
      </button>
      {open && (
        <div className="ap-dialog-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section ref={dialogRef} className="ap-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <header className="ap-dialog-head">
              <h2 id={titleId}>{title}</h2>
              <button className="ap-icon-btn" type="button" aria-label="Đóng cửa sổ" onClick={() => setOpen(false)}><AdminIcon name="close" size={18} /></button>
            </header>
            <div className="ap-dialog-body">{children}</div>
          </section>
        </div>
      )}
    </>
  );
}
