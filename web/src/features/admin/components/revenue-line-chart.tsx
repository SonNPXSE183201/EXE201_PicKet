"use client";
import { useEffect, useRef, useState } from "react";
import { formatVnd } from "@picket/domain";

export type LineColumn = { key: string; label: string; title: string; parts: { source: string; amount: number }[]; total: number };
export type LineSeries = { source: string; name: string; color: string };

const H = 280;
const PAD = { top: 16, right: 16, bottom: 30, left: 56 };
const compact = (v: number) =>
  v >= 1e9 ? `${+(v / 1e9).toFixed(1)} tỷ` : v >= 1e6 ? `${+(v / 1e6).toFixed(1)} tr` : v >= 1e3 ? `${+(v / 1e3).toFixed(0)}k` : String(Math.round(v));
const niceMax = (v: number) => {
  if (v <= 0) return 10_000;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

/** Pixel-accurate line chart: one line per source, a faint area under the total, dots on days with
    revenue, and a crosshair tooltip on hover/touch. */
export function RevenueLineChart({ columns, series }: { columns: LineColumn[]; series: LineSeries[]; selected?: string[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => setWidth(Math.max(280, el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const n = columns.length;
  const max = niceMax(Math.max(0, ...columns.map((c) => c.total)));
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (Math.max(0, v) / max) * innerH;
  const amount = (c: LineColumn, s: string) => c.parts.find((p) => p.source === s)?.amount ?? 0;
  const path = (get: (c: LineColumn) => number) => columns.map((c, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(get(c)).toFixed(1)}`).join("");
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(innerW / 80))));
  const active = hover === null ? null : columns[hover];
  const flip = hover !== null && x(hover) > width * 0.6;
  const tipLeft = hover === null ? 0 : flip ? x(hover) - 16 : x(hover) + 16;
  const move = (clientX: number) => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box || n === 0) return;
    const ratio = (clientX - box.left - PAD.left) / innerW;
    setHover(Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1)))));
  };
  return (
    <div ref={wrap} className="rlc" onMouseMove={(e) => move(e.clientX)} onMouseLeave={() => setHover(null)} onTouchMove={(e) => move(e.touches[0].clientX)} onTouchEnd={() => setHover(null)}>
      <svg width={width} height={H} role="img" aria-label={`Biểu đồ đường doanh thu, ${n} mốc, cao nhất ${formatVnd(max)}`}>
        <defs>
          <linearGradient id="rlc-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--ap-mauve)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--ap-mauve)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <text className="rlc-axis" x={PAD.left - 10} y={y(max * g) + 4} textAnchor="end">{compact(max * g)}</text>
          </g>
        ))}
        <path d={`${path((c) => c.total)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`} fill="url(#rlc-area)" />
        {series.map((s) => (
          <path key={s.source} d={path((c) => amount(c, s.source))} className="rlc-line" stroke={s.color} />
        ))}
        {series.map((s) => columns.map((c, i) => amount(c, s.source) > 0 && (
          <circle key={`${s.source}-${c.key}`} className="rlc-dot" cx={x(i)} cy={y(amount(c, s.source))} r={hover === i ? 5.5 : 3.5} stroke={s.color} />
        )))}
        {columns.map((c, i) => i % labelEvery === 0 && (
          <text key={c.key} className="rlc-axis" x={x(i)} y={H - 8} textAnchor="middle">{c.label}</text>
        ))}
      </svg>
      {active && (
        <div className={`rlc-tip${flip ? " is-left" : ""}`} style={{ left: tipLeft, top: 8 }} role="status">
          <strong>{active.title}</strong>
          {series.map((s) => <span key={s.source}><i style={{ background: s.color }} />{s.name}<b>{formatVnd(amount(active, s.source))}</b></span>)}
          <span className="rlc-total">Tổng<b>{formatVnd(active.total)}</b></span>
        </div>
      )}
    </div>
  );
}
