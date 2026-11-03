"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/core/auth/require-api-session";
export async function saveUserPermission(form: FormData) {
  const { api, accessToken } = await requireApiSession("admin");
  const userId = String(form.get("userId") ?? "");
  const path = `/admin/permissions?userId=${encodeURIComponent(userId)}`;
  try {
    const expiry = String(form.get("expiresAt") ?? "");
    await api.updatePermission(accessToken, {
      userId,
      permission: String(form.get("permission")),
      allowed: form.get("allowed") === "true",
      expiresAt: expiry ? new Date(`${expiry}+07:00`).toISOString() : null,
      revision: Number(form.get("revision")),
      reason: String(form.get("reason")),
    });
  } catch {
    redirect(`${path}&error=save`);
  }
  revalidatePath("/admin", "layout");
  redirect(`${path}&saved=1`);
}
export async function savePermissionGroup(form: FormData) {
  const { api, accessToken } = await requireApiSession("admin");
  const userId = String(form.get("userId") ?? "");
  const path = `/admin/permissions?userId=${encodeURIComponent(userId)}`;
  try {
    const action = String(form.get("action"));
    const body: Record<string, unknown> = { action };
    if (form.get("id")) body.id = String(form.get("id"));
    if (action === "save") {
      body.name = String(form.get("name"));
      body.revision = Number(form.get("revision"));
      body.permissions = form.getAll("permissions").map(String);
    } else {
      body.userId = userId;
      body.enabled = form.get("enabled") === "true";
      const expiry = String(form.get("expiresAt") ?? "");
      body.expiresAt = expiry
        ? new Date(`${expiry}+07:00`).toISOString()
        : null;
    }
    await api.updatePermissionGroup(
      accessToken,
      body,
      String(form.get("reason")),
    );
  } catch {
    redirect(`${path}&error=save`);
  }
  revalidatePath("/admin", "layout");
  redirect(`${path}&saved=1`);
}
