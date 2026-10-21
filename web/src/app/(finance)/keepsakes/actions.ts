"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApiSession } from "@/core/auth/require-api-session";

export async function saveKeepsake(data: FormData) {
  const { api, accessToken, claims } = await requireApiSession();
  try {
    const title = String(data.get("title") ?? "").trim(),
      note = String(data.get("note") ?? "").trim(),
      category = String(data.get("category") ?? "").trim();
    const amount = Number(data.get("amount")),
      id = String(data.get("id") ?? ""),
      version = Number(data.get("version"));
    const date = (key: string, required = false) => {
      const value = String(data.get(key) ?? "");
      if (!value && !required) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))
        throw Error("date");
      return value;
    };
    if (
      !title ||
      title.length > 160 ||
      note.length > 1000 ||
      !category ||
      category.length > 80 ||
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      amount > 9e12
    )
      throw Error("input");
    const mediaPath = String(data.get("mediaPath") ?? "").trim();
    if (
      mediaPath &&
      (!mediaPath.startsWith(String(claims.sub) + "/") ||
        mediaPath.includes("..") ||
        !/^.+\.(jpg|jpeg|png|webp)$/i.test(mediaPath))
    )
      throw Error("image");
    const input = {
      title,
      note,
      category,
      amount,
      mediaPath: mediaPath || null,
      purchasedAt: date("purchasedAt", true) + "T12:00:00.000Z",
      warrantyUntil: date("warrantyUntil"),
      returnUntil: date("returnUntil"),
    };
    if (id) {
      if (
        !/^[\da-f-]{36}$/i.test(id) ||
        !Number.isSafeInteger(version) ||
        version < 1
      )
        throw Error("version");
      await api.updateKeepsake(accessToken, id, {
        ...input,
        expectedVersion: version,
      });
    } else
      await api.createKeepsake(accessToken, {
        ...input,
        id: crypto.randomUUID(),
      });
  } catch {
    redirect("/keepsakes?error=save_failed");
  }
  revalidatePath("/keepsakes");
  revalidatePath("/notifications");
  redirect("/keepsakes?saved=1");
}

export async function archiveKeepsake(data: FormData) {
  const { api, accessToken } = await requireApiSession();
  try {
    const id = String(data.get("id") ?? ""),
      version = Number(data.get("version"));
    if (
      data.get("confirmation") !== "ARCHIVE" ||
      !/^[\da-f-]{36}$/i.test(id) ||
      !Number.isSafeInteger(version) ||
      version < 1
    )
      throw Error("input");
    await api.archiveKeepsake(accessToken, id, version);
  } catch {
    redirect("/keepsakes?error=archive_failed");
  }
  revalidatePath("/keepsakes");
  redirect("/keepsakes?saved=1");
}
