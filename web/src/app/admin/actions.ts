"use server";

import type { AdminUserActionRequest } from "@picket/domain";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireApiSession } from "@/core/auth/require-api-session";

function uuid(value: FormDataEntryValue | null): string {
  const id = String(value ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("Invalid user ID");
  }
  return id;
}

function page(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "0");
  return /^\d{1,6}$/.test(raw) ? Math.min(Number(raw), 100_000) : 0;
}

export async function performAdminAction(data: FormData) {
  const targetUser = uuid(data.get("targetUser"));
  const currentPage = page(data.get("page"));
  const action = String(data.get("action") ?? "");
  const confirmation = String(data.get("confirmation") ?? "");
  const tier = String(data.get("tier") ?? "");
  let request: AdminUserActionRequest;
  if (action === "suspend" && confirmation === "SUSPEND") {
    request = { action, confirmation };
  } else if (action === "restore" && confirmation === "RESTORE") {
    request = { action, confirmation };
  } else if (action === "reset_password" && confirmation === "RESET") {
    request = { action, confirmation };
  } else if (
    action === "grant_plan" && confirmation === "GRANT" &&
    ["free", "plus", "pro"].includes(tier)
  ) {
    request = {
      action,
      confirmation,
      tier: tier as "free" | "plus" | "pro",
    };
  } else {
    redirect(`/admin?page=${currentPage}&error=confirmation`);
  }
  try {
    const { accessToken, api } = await requireApiSession('admin');
    await api.adminUserAction(accessToken, targetUser, request);
  } catch {
    redirect(`/admin?page=${currentPage}&error=action_failed`);
  }
  revalidatePath("/admin");
  redirect(`/admin?page=${currentPage}&done=1`);
}
