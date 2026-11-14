"use client";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useTransition } from "react";

export type SlidingTab = { key: string; label: string; href: string };

/** Pill tabs whose highlight glides sideways to the chosen tab. The highlight moves at once on
    click (before the server answers), then the page navigates. */
export function SlidingTabs({ tabs, activeKey, label }: { tabs: SlidingTab[]; activeKey: string; label: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [picked, setPicked] = useState<{ from: string; key: string } | null>(null);
  const chosen = picked && picked.from === activeKey ? picked.key : activeKey;
  const refs = useRef(new Map<string, HTMLAnchorElement>());
  const [box, setBox] = useState<{ x: number; w: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current.get(chosen);
      if (el) setBox({ x: el.offsetLeft, w: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [chosen]);
  return (
    <nav className="fin-tabs" aria-label={label}>
      <span className="fin-tabs-pill" aria-hidden="true" style={box ? { transform: `translateX(${box.x}px)`, width: box.w, opacity: 1 } : undefined} />
      {tabs.map((tab) => (
        <a
          key={tab.key}
          ref={(el) => { if (el) refs.current.set(tab.key, el); }}
          href={tab.href}
          aria-current={tab.key === chosen ? "true" : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            setPicked({ from: activeKey, key: tab.key });
            startTransition(() => router.push(tab.href, { scroll: false }));
          }}
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
