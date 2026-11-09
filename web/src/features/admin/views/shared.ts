import type { AdminSection } from "../admin-permissions";
import { canViewAdminSection } from "../admin-permissions";
import { adminLabel } from "../admin-labels";

export type Row = Record<string, unknown>;
export type Query = Record<string, string | undefined>;
export type Document = Record<string, unknown>;

/** Everything a section view needs; data comes from GET /v1/admin/portal. */
export type ViewProps = {
  section: AdminSection;
  data: Document;
  query: Query;
  role: string | null;
  permissions: readonly string[];
  mfaVerified: boolean;
  days: number;
  page: number;
  /** First name for greetings, derived from the staff email. */
  greetingName?: string;
};

export const rows = (value: unknown): Row[] =>
  Array.isArray(value) ? value.filter((r): r is Row => Boolean(r) && typeof r === "object") : [];
export const object = (v: unknown): Row => (v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {});
export const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined);
export const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
export const label = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : adminLabel(String(v)));
export const can = (p: ViewProps, s: AdminSection) => canViewAdminSection(p.role, s, p.permissions);

/** Builds a link to the same section keeping filters (minus page/notices). */
export function sectionHref(base: string, query: Query, patch: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v && !["page", "done", "error"].includes(k)) next.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  return qs ? `${base}?${qs}` : base;
}

export type StatusTone = "success" | "warning" | "danger" | "neutral" | "lilac" | "coral" | "outline" | "mauve";
/** Maps backend status codes to chip colours used in the Figma screens. */
export function statusTone(status: unknown): StatusTone {
  switch (String(status ?? "").toLowerCase()) {
    case "ok": case "active": case "published": case "resolved": case "verified": case "healthy": case "ready": case "paid": case "closed":
      return "success";
    case "degraded": case "review": case "investigating": case "in_progress": case "pending": case "processing": case "unverified": case "high": case "warning":
      return "warning";
    case "error": case "failed": case "down": case "stale": case "urgent": case "suspended": case "cancelled": case "expired":
      return "danger";
    case "open":
      return "coral";
    case "draft": case "archived": case "not_configured": case "low": case "normal":
      return "outline";
    default:
      return "neutral";
  }
}

/** Display names/icons for health components and data sources (Figma wording). */
export const componentInfo: Record<string, { name: string; icon: string; tone: "coral" | "mint" | "blue" | "lilac" | "cream" }> = {
  api: { name: "API Picket", icon: "bolt", tone: "mint" },
  database: { name: "Cơ sở dữ liệu", icon: "grid", tone: "blue" },
  ocr_cloud: { name: "OCR cloud", icon: "receipt", tone: "coral" },
  realtime: { name: "Đồng bộ realtime", icon: "calendar", tone: "lilac" },
  google_play: { name: "Google Play API", icon: "wallet", tone: "mint" },
  storage: { name: "Lưu trữ ảnh", icon: "image", tone: "blue" },
  apk_access: { name: "Máy chủ APK", icon: "download", tone: "blue" },
  landing_analytics: { name: "Landing analytics", icon: "eye", tone: "lilac" },
  ocr_provider: { name: "Nhà cung cấp OCR", icon: "receipt", tone: "coral" },
  google_play_installs: { name: "Google Play", icon: "wallet", tone: "mint" },
};
export const componentName = (key: unknown) => componentInfo[str(key)]?.name ?? label(key);

/** "linh.tran@picket.vn" → "Linh". */
export function firstName(email: unknown) {
  const local = str(email).split("@")[0].split(/[._-]+/)[0];
  return local ? local[0].toUpperCase() + local.slice(1) : undefined;
}
