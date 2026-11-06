import Link from "next/link";
import type { ReactNode } from "react";
import { AdminIcon } from "./admin-icon";

/* Presentational building blocks for the admin "Paper" design (Figma › Admin Web).
   Server-safe: no state, no browser APIs. Styles live in admin-paper.css. */

export type Tone = "coral" | "mint" | "blue" | "lilac" | "cream";
export type ChipTone = "neutral" | "success" | "warning" | "danger" | "mauve" | "coral" | "lilac" | "outline";

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

export function Card({ eyebrow, title, note, actions, children, receipt = false, flat = false, compact = false, className, as: Tag = "section", ...rest }: {
  eyebrow?: ReactNode; title?: ReactNode; note?: ReactNode; actions?: ReactNode; children?: ReactNode;
  receipt?: boolean; flat?: boolean; compact?: boolean; className?: string; as?: "section" | "article" | "div";
  "aria-label"?: string;
}) {
  const head = eyebrow || title || actions;
  return (
    <Tag className={cx("ap-card", receipt && "is-receipt", flat && "is-flat", compact && "is-compact", className)} {...rest}>
      {head && (
        <header className="ap-card-head">
          <div>
            {eyebrow && <span className="ap-eyebrow">{eyebrow}</span>}
            {title && <h2 className="ap-card-title">{title}</h2>}
          </div>
          {actions && <div className="ap-row">{actions}</div>}
        </header>
      )}
      {note && <p className="ap-card-note">{note}</p>}
      {children}
    </Tag>
  );
}

export function Tile({ icon, tone = "cream", large = false }: { icon: string; tone?: Tone; large?: boolean }) {
  return <span className={cx("ap-tile", large ? "is-lg" : `ap-tone-${tone}`)}><AdminIcon name={icon} size={large ? 20 : 18} /></span>;
}

export function Chip({ tone = "neutral", children, icon }: { tone?: ChipTone; children: ReactNode; icon?: string }) {
  return <span className={cx("ap-chip", tone !== "neutral" && `is-${tone}`)}>{icon && <AdminIcon name={icon} size={12} />}{children}</span>;
}

export function Kpi({ icon, tone = "cream", label, value, note, chip, href, hero = false }: {
  icon?: string; tone?: Tone; label: ReactNode; value: ReactNode; note?: ReactNode; chip?: ReactNode; href?: string; hero?: boolean;
}) {
  return (
    <article className="ap-card is-receipt ap-kpi">
      <div className="ap-kpi-head">{icon && <Tile icon={icon} tone={tone} />}<span>{label}</span>{chip}</div>
      <p className={cx("ap-kpi-value", hero && "is-hero")}>{value}</p>
      {note && <p className="ap-kpi-note">{note}</p>}
      {href && <Link className="ap-kpi-link" href={href} aria-label={typeof label === "string" ? `Mở ${label}` : "Mở chi tiết"} />}
    </article>
  );
}

export function Button({ href, variant = "primary", size, block, icon, children, ...rest }: {
  href?: string; variant?: "primary" | "secondary" | "ghost" | "coral" | "danger"; size?: "sm"; block?: boolean; icon?: string; children: ReactNode;
  type?: "submit" | "button"; disabled?: boolean; name?: string; value?: string; form?: string; "aria-label"?: string;
}) {
  const className = cx("ap-btn", variant !== "primary" && `is-${variant}`, size === "sm" && "is-sm", block && "is-block");
  const content = <>{icon && <AdminIcon name={icon} size={18} />}{children}</>;
  return href
    ? <Link className={className} href={href} aria-label={rest["aria-label"]}>{content}</Link>
    : <button className={className} type={rest.type ?? "button"} {...rest}>{content}</button>;
}

export type Column<T> = {
  key: string; label: ReactNode; align?: "left" | "right"; width?: string; muted?: boolean;
  render?: (row: T, index: number) => ReactNode;
};

/** Table that turns into stacked cards on phones (labels come from data-label). */
export function Table<T extends Record<string, unknown>>({ columns, rows, caption, empty = "Chưa có dữ liệu phù hợp trong kỳ này.", rowKey, selected }: {
  columns: Column<T>[]; rows: T[]; caption: string; empty?: ReactNode; rowKey?: (row: T, index: number) => string; selected?: (row: T) => boolean;
}) {
  return (
    <div className="ap-table-wrap">
      <table className="ap-table is-stack">
        <caption className="ap-sr">{caption}</caption>
        <thead><tr>{columns.map((c) => <th key={c.key} scope="col" className={c.align === "right" ? "is-num" : undefined} style={c.width ? { width: c.width } : undefined}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, i) => (
            <tr key={rowKey ? rowKey(row, i) : String(row.id ?? i)} className={selected?.(row) ? "is-selected" : undefined}>
              {columns.map((c) => (
                <td key={c.key} data-label={typeof c.label === "string" ? c.label : undefined} className={cx(c.align === "right" && "is-num", c.muted && "is-muted")}>
                  {c.render ? c.render(row, i) : display(row[c.key])}
                </td>
              ))}
            </tr>
          )) : <tr><td className="ap-empty-row" colSpan={columns.length}>{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function Person({ name, sub, href, tone = "coral" }: { name: string; sub?: ReactNode; href?: string; tone?: Tone }) {
  const body = <><span className={cx("ap-avatar", `ap-tone-${tone}`)}>{initial(name)}</span><span style={{ minWidth: 0 }}><b>{name}</b>{sub && <small>{sub}</small>}</span></>;
  return href ? <Link className="ap-person" href={href}>{body}</Link> : <span className="ap-person">{body}</span>;
}

export function Field({ label, children, grow, width }: { label: ReactNode; children: ReactNode; grow?: boolean; width?: number }) {
  return <label className="ap-field" style={{ flex: grow ? "1 1 200px" : width ? `0 1 ${width}px` : undefined }}><span>{label}</span>{children}</label>;
}

export function Banner({ tone = "warning", icon = "alert", title, text, action, eyebrow }: {
  tone?: "warning" | "success" | "danger" | "incident"; icon?: string; title: ReactNode; text?: ReactNode; action?: ReactNode; eyebrow?: ReactNode;
}) {
  return (
    <div className={cx("ap-banner", tone !== "warning" && `is-${tone}`)} role={tone === "danger" ? "alert" : "status"}>
      <Tile icon={icon} />
      <div>{eyebrow && <span className="ap-eyebrow">{eyebrow}</span>}<b>{title}</b>{text && <p>{text}</p>}</div>
      {action}
    </div>
  );
}

export function EmptyState({ art, code, title, text, actions }: { art?: string; code?: string; title: ReactNode; text?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ap-empty">
      {art && <img src={art} alt="" width={168} height={168} />}
      {code && <span className="ap-eyebrow">{code}</span>}
      <h2>{title}</h2>
      {text && <p>{text}</p>}
      {actions && <div className="ap-row">{actions}</div>}
    </div>
  );
}

export function Bars({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="ap-bars" role="img" aria-label={label}>
      {values.map((v, i) => <span key={i} style={{ height: `${Math.max(8, (v / max) * 100)}%` }} />)}
    </div>
  );
}

export function Progress({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return <div className="ap-progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}><span style={{ width: `${pct}%`, background: color }} /></div>;
}

export function Timeline({ items }: { items: { title: ReactNode; meta?: ReactNode; color?: string }[] }) {
  return <ol className="ap-timeline">{items.map((it, i) => <li key={i} style={it.color ? ({ "--dot": it.color } as React.CSSProperties) : undefined}>{it.title}{it.meta && <small>{it.meta}</small>}</li>)}</ol>;
}

export function Drawer({ title, closeHref, children }: { title: ReactNode; closeHref: string; children: ReactNode }) {
  return (
    <>
      <Link className="ap-drawer-scrim" href={closeHref} aria-label="Đóng" tabIndex={-1} />
      <aside className="ap-drawer" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Chi tiết"}>
        <div className="ap-drawer-head"><h2>{title}</h2><Link className="ap-icon-btn" href={closeHref} aria-label="Đóng"><AdminIcon name="close" size={20} /></Link></div>
        {children}
      </aside>
    </>
  );
}

/* ---------- formatting ---------- */
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
export function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") return numberFormat.format(value);
  if (typeof value === "object") return JSON.stringify(value);
  const raw = String(value);
  if (/^\d{4}-\d\d-\d\dT/.test(raw) && !Number.isNaN(Date.parse(raw))) return formatDateTime(raw);
  return raw;
}
export const formatNumber = (value: unknown) => (typeof value === "number" || (typeof value === "string" && value !== "" && !Number.isNaN(Number(value))) ? numberFormat.format(Number(value)) : "—");
export function formatDateTime(value: unknown) {
  const t = Date.parse(String(value ?? ""));
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });
}
export function formatDate(value: unknown) {
  const t = Date.parse(String(value ?? ""));
  return Number.isNaN(t) ? "—" : new Date(t).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
}
export function relativeTime(value: unknown, now = Date.now()) {
  const t = Date.parse(String(value ?? ""));
  if (Number.isNaN(t)) return "—";
  const m = Math.round((now - t) / 60000);
  if (m < 1) return "Vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.round(h / 24);
  if (d === 1) return "Hôm qua";
  if (d < 7) return `${d} ngày trước`;
  if (d < 30) return `${Math.round(d / 7)} tuần trước`;
  return formatDate(value);
}
export function initial(name: string) {
  const s = name.trim();
  return (s.match(/[\p{L}\p{N}]/u)?.[0] ?? "?").toUpperCase();
}
export const tones: Tone[] = ["coral", "mint", "blue", "lilac", "cream"];
export const toneFor = (seed: string): Tone => tones[[...seed].reduce((s, c) => s + c.charCodeAt(0), 0) % 4];
