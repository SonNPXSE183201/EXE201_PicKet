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
export async function adjustRevenue(form: FormData) {
  const { api, accessToken } = await requireApiSession("admin");
  const ledgerId = Number(form.get("ledgerId"));
  const path = `/admin/revenue?id=${ledgerId}`;
  try {
    await api.adminRevenueAdjust(accessToken, {
      ledgerId,
      amountVnd: Number(form.get("amountVnd")),
      kind: form.get("kind") === "adjustment" ? "adjustment" : "refund",
      reason: String(form.get("reason") ?? ""),
      externalRef: String(form.get("externalRef") ?? "") || undefined,
    });
  } catch {
    redirect(`${path}&error=adjust`);
  }
  revalidatePath("/admin", "layout");
  redirect(`${path}&saved=1`);
}
const vnInput = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "");
  return text ? new Date(`${text}:00+07:00`).toISOString() : null;
};
export async function savePromotionAction(form: FormData) {
  const { api, accessToken } = await requireApiSession("admin");
  const id = String(form.get("id") ?? "");
  const max = String(form.get("maxRedemptions") ?? "");
  try {
    await api.savePromotion(
      accessToken,
      {
        ...(id ? { id, revision: Number(form.get("revision")) } : {}),
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        code: String(form.get("code") ?? "").trim().toUpperCase(),
        discountPercent: Number(form.get("discountPercent")),
        skus: form.getAll("skus").map(String),
        channels: form.getAll("channels").map(String),
        startsAt: vnInput(form.get("startsAt")),
        endsAt: vnInput(form.get("endsAt")),
        maxRedemptions: max ? Number(max) : null,
        perUserLimit: Number(form.get("perUserLimit") || 1),
        enabled: form.get("enabled") === "true",
        priority: Number(form.get("priority") || 0),
        playOfferId: String(form.get("playOfferId") ?? ""),
      },
      String(form.get("reason") ?? ""),
    );
  } catch {
    redirect(`/admin/promotions?${id ? `edit=${id}&` : ""}error=save`);
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/promotions?saved=1");
}
