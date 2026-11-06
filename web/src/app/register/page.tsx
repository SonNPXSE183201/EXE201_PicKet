import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";

import Link from 'next/link';
import { AuthShell } from "@/features/auth/components/auth-shell";

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/dashboard");
  return (
    <AuthShell variant="register">
      <div className="auth-card"><h1>Đăng ký bằng số điện thoại</h1><p>Đăng ký tài khoản mới chưa sẵn sàng. Vui lòng quay lại sau.</p><Link href="/login">Đã có tài khoản? Đăng nhập</Link></div>
    </AuthShell>
  );
}
