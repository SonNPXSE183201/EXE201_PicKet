"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createClient } from "@/core/supabase/client";
import { CreatePasswordForm } from "@/features/auth/components/create-password-form";

export function CreatePasswordPageForm() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(password: string) {
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password, data: { password_setup_required: false } });
      if (error) {
        setMessage(error.code === "weak_password"
          ? "Mật khẩu chưa đủ mạnh. Hãy dùng mật khẩu khác."
          : "Chưa lưu được mật khẩu. Vui lòng thử lại.");
        setBusy(false);
        return;
      }
      // The access token still carries the old metadata; refresh it before the proxy checks again.
      await supabase.auth.refreshSession().catch(() => undefined);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setMessage("Không thể kết nối. Kiểm tra mạng rồi thử lại.");
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    await supabase.auth.signOut().catch(() => undefined);
    router.replace("/login");
    router.refresh();
  }

  return (
    <CreatePasswordForm busy={busy} message={message} onSubmit={save}
      footer={<button className="pa-link" type="button" onClick={signOut} disabled={busy}>Dùng tài khoản khác</button>} />
  );
}
