import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";

import { LoginForm } from "./login-form";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";
import { hasPinDevice } from "@/features/auth/pin-device";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string; portal?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/session");

  const params = await searchParams;
  const initialError = params.error === "expired"
    ? "Phiên đăng nhập đã hết hạn hoặc đã bị khoá. Vui lòng đăng nhập lại."
    : params.error ? "Đăng nhập không hoàn tất. Vui lòng thử lại." : undefined;
  // Staff land here from /admin; show the admin sign-in from Figma › Admin Web.
  const admin = params.portal === "admin" || (params.next ?? "").startsWith("/admin");
  const next = params.next && /^\/(?!\/)/.test(params.next) ? params.next : "/session";

  return (
    <PaperAuthShell variant={admin ? "admin" : "user"}>
      <LoginForm initialError={initialError} admin={admin} next={next} pinAvailable={!admin && (await hasPinDevice())} />
    </PaperAuthShell>
  );
}
