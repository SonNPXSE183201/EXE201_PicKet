import type { AdminUserActionRequest } from "@picket/domain";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";

export interface PartnerAd {
  id: string;
  title: string;
  body: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface StaffOverview {
  total_users: number;
  total_ledgers: number;
  users: Array<{
    id: string;
    email: string;
    created_at: string;
    banned_until: string | null;
    revision: number | null;
    entry_count: number;
  }>;
  ocr: Array<{ day: string; scans: number; successful: number; average_ms: number }>;
  ads: PartnerAd[];
  settings: { maintenance: boolean; notice: string };
  audit: Array<{ action: string; target: string | null; created_at: string }>;
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase chưa được cấu hình.");
  return supabase;
}

export async function isStaff() {
  const { data, error } = await requireSupabase().rpc("is_staff");
  if (error) throw error;
  return data === true;
}

export async function loadStaffOverview(page: number): Promise<StaffOverview> {
  if (!Number.isSafeInteger(page) || page < 0 || page > 100_000) throw new Error("Trang không hợp lệ.");
  const { data, error } = await requireSupabase().rpc("admin_overview", { page_number: page });
  if (error) throw error;
  if (!data || typeof data !== "object" || !Array.isArray(data.users) || !Array.isArray(data.audit)) {
    throw new Error("Dữ liệu quản trị không hợp lệ.");
  }
  return data as StaffOverview;
}

export async function loadStaffLedger(userId: string) {
  const { data, error } = await requireSupabase().rpc("admin_ledger", { target_user: userId });
  if (error) throw error;
  return data as { entries?: Array<{ title?: string; date?: string; category?: string; amount?: number }> } | null;
}

export async function performStaffAction(token: string, userId: string, request: AdminUserActionRequest) {
  if (!picketApi) throw new Error("Chưa thể thực hiện lúc này. Hãy thử lại sau.");
  await picketApi.adminUserAction(token, userId, request);
}

export async function saveStaffSettings(maintenance: boolean, notice: string) {
  if (notice.length > 1000) throw new Error("Thông báo quá dài.");
  const { error } = await requireSupabase().rpc("admin_save_settings", {
    p_maintenance: maintenance, p_notice: notice.trim(),
  });
  if (error) throw error;
}

export async function savePartnerAd(input: Omit<PartnerAd, "created_at" | "id"> & { id: string | null }) {
  if (!input.title.trim() || input.title.length > 120 || input.body.length > 500 || !isSafeHttpsUrl(input.url)) {
    throw new Error("Nội dung đối tác không hợp lệ.");
  }
  const { error } = await requireSupabase().rpc("admin_save_ad", {
    p_id: input.id, p_title: input.title.trim(), p_body: input.body.trim(),
    p_url: input.url.trim(), p_active: input.active,
  });
  if (error) throw error;
}

export function isSafeHttpsUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
}
