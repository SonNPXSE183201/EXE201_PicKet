"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/core/auth/require-api-session";

const actionSections: Record<string, string> = {
  revoke_sessions: "users",
  comment: "tickets",
  review_content: "content",
  ticket: "tickets",
  incident: "incidents",
  release: "releases",
  content: "content",
  staff: "staff",
  settings: "settings",
  partner: "partners",
  grant: "billing",
};
export async function mutateAdmin(form: FormData) {
  const { api, accessToken } = await requireApiSession("admin");
  const action = String(form.get("action") ?? "");
  const section = actionSections[action];
  if (!section) redirect("/admin?error=validation");
  const target = `/admin/${section}`;
  try {
    if (form.get("confirmation") !== "SAVE") throw new Error();
    const reason = String(form.get("reason") ?? "").trim();
    const requestId = String(form.get("requestId") ?? randomUUID());
    const body: Record<string, unknown> = {};
    for (const field of [
      "id",
      "title",
      "body",
      "status",
      "priority",
      "category",
      "targetUser",
      "ticketId",
      "assignee",
      "userId",
      "role",
      "tier",
      "url",
      "startsAt",
      "endsAt",
    ]) {
      const value = String(form.get(field) ?? "").trim();
      if (value) body[field] = value;
    }
    if (form.has("expectedVersion"))
      body.expectedVersion = Number(form.get("expectedVersion"));
    if (action === "release")
      body.details = {
        version: String(form.get("version")),
        versionCode: Number(form.get("versionCode")),
        url: String(form.get("releaseUrl")),
        sha256: String(form.get("sha256")),
      };
    if (action === "incident")
      body.details = {
        component: String(form.get("component") ?? ""),
        severity: String(form.get("severity") ?? "medium"),
      };
    if (action === "content")
      body.details = {
        lessonId: String(form.get("lessonId") ?? ""),
        locale: String(form.get("locale") ?? "vi"),
        contentVersion: Number(form.get("contentVersion") ?? 1),
      };
    if (action === "partner")
      for (const field of ["startsAt", "endsAt"]) {
        const v = String(form.get(field) ?? "");
        body[field] = v ? new Date(`${v}Z`).toISOString() : null;
      }
    if (action === "settings") {
      for (const field of [
        "analyticsRetentionDays",
        "aggregateRetentionMonths",
      ])
        if (form.has(field)) body[field] = Number(form.get(field));
      for (const [field, fallback] of [
        ["diskWarningPercent", 85],
        ["probeTimeoutSeconds", 8],
        ["staleMinutes", 15],
      ] as const)
        body[field] = Number(form.get(field) ?? fallback);
      body.maintenance = form.get("maintenance") === "on";
      body.notice = String(form.get("notice") ?? "").trim();
    }
    if (action === "partner") body.active = form.get("active") === "on";
    await api.adminMutate(accessToken, { action, body, reason, requestId });
  } catch {
    redirect(`${target}?error=save`);
  }
  revalidatePath("/admin", "layout");
  redirect(`${target}?done=1`);
}

export async function accountAction(form: FormData) {
  const { api, accessToken } = await requireApiSession("admin");
  try {
    if (form.get("confirmation") !== "SAVE") throw new Error();
    await api.adminAccountAction(accessToken, {
      action: String(form.get("action")),
      userId: String(form.get("userId")),
      reason: String(form.get("reason")),
      requestId: String(form.get("requestId")),
    });
  } catch {
    redirect("/admin/users?error=save");
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/users?done=1");
}
