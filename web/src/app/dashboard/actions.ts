"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import {revokePinDevice} from '@/features/auth/pin-actions';

export async function signOut() {
  try { await revokePinDevice(); } catch { /* Auth sign-out below revokes the underlying refresh session. */ }
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
