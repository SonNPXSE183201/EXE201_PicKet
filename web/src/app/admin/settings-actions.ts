"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/core/auth/require-api-session";
import { createClient } from "@/core/supabase/server";

export async function saveSettings(form: FormData) {
  await requireApiSession("admin");
  const notice = String(form.get("notice") ?? "").trim();
  if (form.get("confirmation") !== "SAVE" || notice.length > 1000)
    redirect("/admin/settings?error=validation");
  const client = await createClient();
  const { error } = await client.rpc("admin_save_settings", {
    p_maintenance: form.get("maintenance") === "on",
    p_notice: notice,
  });
  if (error) redirect("/admin/settings?error=save");
  revalidatePath("/admin", "layout");
  redirect("/admin/settings?done=1");
}

export async function saveAd(form: FormData) {
  await requireApiSession("admin");
  const title = String(form.get("title") ?? "").trim(),
    body = String(form.get("body") ?? "").trim(),
    url = String(form.get("url") ?? "").trim();
  const id = String(form.get("id") ?? "");
  let safe = false;
  try {
    const parsed = new URL(url);
    safe = parsed.protocol === "https:" && !parsed.username && !parsed.password;
  } catch {}
  if (
    !safe ||
    !title ||
    title.length > 120 ||
    body.length > 500 ||
    form.get("confirmation") !== "SAVE" ||
    (id && !/^[0-9a-f-]{36}$/i.test(id))
  )
    redirect("/admin/partners?error=validation");
  const client = await createClient();
  const { error } = await client.rpc("admin_save_ad", {
    p_id: id || null,
    p_title: title,
    p_body: body,
    p_url: url,
    p_active: form.get("active") === "on",
  });
  if (error) redirect("/admin/partners?error=save");
  revalidatePath("/admin", "layout");
  redirect("/admin/partners?done=1");
}
