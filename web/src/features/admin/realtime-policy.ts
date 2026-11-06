import type { AdminSection } from "./admin-permissions";

/* Which admin screens show data from each realtime feed section (sections are
   set by the admin_realtime_feed triggers in Supabase). */
const affected: Record<string, AdminSection[]> = {
  users: ["users", "overview"],
  staff: ["staff", "permissions"],
  tickets: ["tickets", "overview", "users"],
  records: ["incidents", "releases", "content", "overview"],
  partners: ["partners"],
  audit: ["audit", "users"],
  health: ["health", "overview"],
  integrations: ["integrations", "acquisition"],
  exports: ["exports"],
  settings: ["settings"],
  payments: ["payments", "revenue", "billing", "overview"],
  revenue: ["revenue"],
  billing: ["billing", "users", "overview"],
  promotions: ["promotions"],
  announcements: ["announcements"],
  releases: ["releases"],
  permissions: ["permissions", "staff"],
  analytics: ["acquisition", "engagement", "overview"],
  ocr: ["ocr", "health"],
};

export function realtimeAffects(feedSection: unknown, current: AdminSection): boolean {
  return typeof feedSection === "string" && (affected[feedSection]?.includes(current) ?? false);
}

/** Refreshing while someone types would discard their input; wait until they are done. */
export function isEditing(active: { tagName?: string; type?: string; isContentEditable?: boolean } | null | undefined): boolean {
  if (!active?.tagName) return false;
  if (active.isContentEditable) return true;
  const tag = active.tagName.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  return !["button", "submit", "reset", "checkbox", "radio", "range", "color", "file", "hidden"].includes(String(active.type ?? "text"));
}
