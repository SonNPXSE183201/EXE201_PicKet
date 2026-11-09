"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/core/supabase/client";
import { Card, Chip, Tile } from "../ui/paper";
import "./modules.css";

type Factor = { id: string; friendly_name?: string; created_at?: string };
const DIGITS = 6;
const fmtDate = (iso?: string) => {
  const t = Date.parse(iso ?? "");
  return Number.isNaN(t) ? "" : new Date(t).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};

/* Figma › Admin Web › 24 · Bảo mật & MFA (156:8376): status card, registered factors, QR + 6 OTP boxes. */
export function MfaPanel() {
  const client = useMemo(() => createClient(), []);
  const router = useRouter();
  const [factor, setFactor] = useState<string | null>(null);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [aal2, setAal2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
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
        const verified = data.totp.filter((f) => f.status === "verified");
        setFactors(verified as Factor[]);
        setFactor(verified[0]?.id ?? null);
        setReady(true);
      })
      .catch(() => {
        if (active) setMessage("Không tải được phương thức MFA. Hãy thử lại.");
      });
    void client.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (active) setAal2(data?.currentLevel === "aal2");
      })
      .catch(() => undefined);
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
      setSecret(data.totp.secret ?? null);
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
      setSecret(null);
      setDigits(Array(DIGITS).fill(""));
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
  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      setDigits((d) => d.map((x, i) => (i === index ? "" : x)));
      return;
    }
    // Typing or pasting several digits fills the following boxes.
    setDigits((d) => {
      const next = [...d];
      clean.slice(0, DIGITS - index).split("").forEach((c, k) => { next[index + k] = c; });
      return next;
    });
    boxes.current[Math.min(DIGITS - 1, index + clean.length)]?.focus();
  }
  const code = digits.join("");
  const showEnroll = ready && !factor;

  return (
    <div className="ap-split-wide am-mfa">
      <div className="am-col">
        <div className={`ap-banner ${aal2 ? "is-success" : ""}`} role="status">
          <Tile icon="shield" />
          <div>
            <span className="ap-eyebrow">Xác thực hai bước</span>
            <b>{aal2 ? "MFA đang bật cho phiên này" : factor ? "Cần xác minh MFA cho phiên này" : "Chưa thiết lập MFA"}</b>
            <p>
              Dùng ứng dụng xác thực trên thiết bị của bạn. Picket yêu cầu MFA trước khi thay đổi dữ liệu quản trị.
            </p>
          </div>
        </div>

        <Card receipt eyebrow="Ứng dụng xác thực" title="Thiết bị đã đăng ký">
          {!ready && message && (
            <button className="ap-btn is-secondary" type="button" onClick={() => setAttempt((value) => value + 1)}>
              Tải lại phương thức MFA
            </button>
          )}
          {!ready && !message && <p className="ap-card-note">Đang tải phương thức MFA…</p>}
          {ready && factors.length === 0 && <p className="ap-card-note">Chưa có thiết bị nào được xác minh.</p>}
          <ul className="am-factors">
            {factors.map((f) => (
              <li key={f.id}>
                <Tile icon="lock" tone="mint" large />
                <span>
                  <b>{f.friendly_name || "Ứng dụng xác thực"}</b>
                  <small>TOTP{fmtDate(f.created_at) ? ` · thêm ${fmtDate(f.created_at)}` : ""}</small>
                </span>
                <Chip tone="success">Đang dùng</Chip>
              </li>
            ))}
          </ul>
        </Card>

        <p className="ap-card-note">
          Mã QR là thông tin riêng tư. Không chia sẻ hoặc đưa vào ảnh báo cáo. Không tự gỡ phương thức xác thực cuối cùng khi chưa có
          đường phục hồi.
        </p>
      </div>

      <Card eyebrow={factor ? (qr ? "Thêm thiết bị" : "Xác minh lại") : "Thiết lập"} title={qr ? "Quét mã bằng ứng dụng xác thực" : factor ? "Nhập mã xác thực" : "Bật xác thực hai bước"}>
        {showEnroll && (
          <>
            <p className="ap-card-note">Bạn chưa có ứng dụng xác thực. Tạo mã QR để thêm Picket Admin vào ứng dụng của bạn.</p>
            <button className="ap-btn is-block" type="button" disabled={busy} onClick={enroll}>Thiết lập MFA</button>
          </>
        )}
        {qr && (
          <div className="am-qr">
            <Image unoptimized src={qr} width={240} height={240} alt="Mã QR để thêm Picket Admin vào ứng dụng xác thực" />
            {secret && <p>Hoặc nhập khoá: <code>{secret.replace(/(.{4})/g, "$1 ").trim()}</code></p>}
          </div>
        )}
        {factor && (
          <form className="ap-form" action={verify}>
            <fieldset disabled={busy} aria-describedby="mfa-otp-help">
              <legend className="ap-eyebrow">Nhập mã 6 số</legend>
              <input type="hidden" name="code" value={code} />
              <div className="ap-otp" role="group" aria-label="Mã xác thực 6 chữ số">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { boxes.current[i] = el; }}
                    value={d}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={DIGITS}
                    required
                    aria-label={`Chữ số ${i + 1}`}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus(); }}
                    onFocus={(e) => e.target.select()}
                  />
                ))}
              </div>
              <p id="mfa-otp-help" className="ap-card-note">Mở ứng dụng xác thực và nhập mã đang hiển thị cho Picket Admin.</p>
              <button className="ap-btn is-block" type="submit" disabled={busy || code.length !== DIGITS}>
                {busy ? "Đang xác minh…" : "Xác minh MFA"}
              </button>
            </fieldset>
          </form>
        )}
        {message && <p className={message.startsWith("Đã") ? "am-message" : "am-error"} role="status">{message}</p>}
      </Card>
    </div>
  );
}
