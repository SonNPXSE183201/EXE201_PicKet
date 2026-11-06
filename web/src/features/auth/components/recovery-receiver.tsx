"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/core/supabase/client";
import { recoverySession } from "@/features/auth/recovery-session";
export function RecoveryReceiver() {
  const client = useMemo(() => createClient(), []),
    router = useRouter(),
    started = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const session = recoverySession(window.location.hash);
    window.history.replaceState(null, "", window.location.pathname);
    void (async () => {
      try {
        if (!session) throw new Error();
        const { error } = await client.auth.setSession(session);
        if (error) throw error;
        const { data, error: userError } = await client.auth.getUser();
        if (userError || !data.user) throw new Error();
        router.replace("/reset-password");
        router.refresh();
      } catch {
        setFailed(true);
      }
    })();
  }, [client, router]);
  return (
    <div className="auth-card">
      <h1 className="auth-title">
        {failed ? "Liên kết khôi phục không hợp lệ" : "Đang xác minh liên kết"}
      </h1>
      <p role="status">
        {failed
          ? "Liên kết có thể đã hết hạn hoặc thiếu thông tin. Gửi yêu cầu mới từ trang Quên mật khẩu."
          : "Vui lòng chờ để tiếp tục đặt mật khẩu."}
      </p>
      {failed && (
        <Link href="/forgot-password" className="button primary">
          Gửi yêu cầu mới
        </Link>
      )}
    </div>
  );
}
