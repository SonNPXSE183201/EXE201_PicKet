"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/core/supabase/client";

export function MfaPanel() {
  const client = useMemo(() => createClient(), []);
  const router = useRouter();
  const [factor, setFactor] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void client.auth.mfa
      .listFactors()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setMessage("Không tải được phương thức MFA. Hãy thử lại.");
          return;
        }
        setFactor(data.totp.find((f) => f.status === "verified")?.id ?? null);
        setReady(true);
      })
      .catch(() => {
        if (active) setMessage("Không tải được phương thức MFA. Hãy thử lại.");
      });
    return () => {
      active = false;
    };
  }, [client, attempt]);
  async function enroll() {
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await client.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Picket Admin ${new Date().toISOString()}`,
      });
      if (error || !data) throw new Error();
      setFactor(data.id);
      setQr(data.totp.qr_code);
    } catch {
      setMessage("Chưa tạo được MFA. Hãy tải lại trang rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }
  async function verify(form: FormData) {
    if (!factor || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await client.auth.mfa.challengeAndVerify({
        factorId: factor,
        code: String(form.get("code") ?? "").trim(),
      });
      if (error) throw new Error();
      setQr(null);
      setMessage("Đã xác minh MFA. Bạn có thể tiếp tục thao tác quản trị.");
      router.refresh();
    } catch {
      setMessage(
        "Mã xác minh không đúng hoặc đã hết hạn. Thử mã mới trong ứng dụng xác thực.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-panel">
      <h2>Xác thực hai bước</h2>
      <p>
        Dùng ứng dụng xác thực trên thiết bị của bạn. Picket yêu cầu MFA trước
        khi thay đổi dữ liệu quản trị.
      </p>
      {!ready && message && (
        <button
          className="button secondary"
          onClick={() => setAttempt((value) => value + 1)}
        >
          Tải lại phương thức MFA
        </button>
      )}
      {qr && (
        <Image
          unoptimized
          src={qr}
          width={240}
          height={240}
          alt="Mã QR để thêm Picket Admin vào ứng dụng xác thực"
        />
      )}
      {ready && !factor && (
        <button className="button primary" disabled={busy} onClick={enroll}>
          Thiết lập MFA
        </button>
      )}
      {factor && (
        <form className="finance-form" action={verify}>
          <label>
            Mã xác thực
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? "Đang xác minh…" : "Xác minh MFA"}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      <p className="admin-note">
        Mã QR là thông tin riêng tư. Không chia sẻ hoặc đưa vào ảnh báo cáo.
        Không tự gỡ phương thức xác thực cuối cùng khi chưa có đường phục hồi.
      </p>
    </section>
  );
}
