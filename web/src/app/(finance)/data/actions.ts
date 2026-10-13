"use server";

import { redirect } from "next/navigation";

import { requireApiSession } from "@/core/auth/require-api-session";
import { createClient } from "@/core/supabase/server";

export async function deleteAccount(data: FormData) {
  if (String(data.get("confirmation") ?? "") !== "DELETE") {
    redirect("/data?error=confirmation");
  }
  try {
    const { accessToken, api } = await requireApiSession();
    await api.deleteAccount(accessToken);
  } catch {
    redirect("/data?error=delete_failed");
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?deleted=1");
}
