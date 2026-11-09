"use client";
import { useState } from "react";
import Link from "next/link";
import { AdminIcon } from "@/features/admin/ui/admin-icon";
import { lockWithPin, unlockWithPin, lockExistingPin, changePin, disablePin } from "../pin-actions";
import { OtpInput } from "./paper-fields";

/* PIN quick unlock (per browser). Unlock: /login/pin. Set up: /security/pin.
   Server actions and field names (pin, confirmation) are unchanged. */
export function PinForm({ lock = false, hasDevicePin = false, change = false, onCancel }: { lock?: boolean; hasDevicePin?: boolean; change?: boolean; onCancel?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const pin = String(form.get("pin") ?? "");
    if (!/^\d{6}$/.test(pin)) return setError("Nhập đủ 6 chữ số.");
    if (lock && pin !== form.get("confirmation")) return setError("Hai mã PIN chưa khớp.");
    setBusy(true);
    setError("");
    const success = await (change ? changePin(form) : lock ? lockWithPin(form) : unlockWithPin(form));
    if (success) {
      // A full load drops the browser Auth SDK's cached session.
      window.location.assign(lock ? "/login/pin" : "/session");
      return;
    }
    setError(lock
      ? `Chưa ${change ? "đổi" : "bật"} được PIN. Vì bảo mật, cần đăng nhập bằng mật khẩu trong 10 phút gần đây. Đăng xuất, đăng nhập lại bằng mật khẩu rồi thử lại.`
      : "PIN chưa đúng hoặc phiên đã hết hiệu lực. Sai nhiều lần sẽ phải chờ 15 phút hoặc đăng nhập bằng mật khẩu.");
    setAttempt((n) => n + 1); // remount the boxes so they clear
    setBusy(false);
  }

  return (
    <form className="pa-form-wrap" onSubmit={submit} aria-busy={busy}>
      <div className="pa-otp-card" key={attempt}>
        <span className="pa-pin-label">{lock ? "Mã PIN mới (6 số)" : "Mã PIN"}</span>
        <OtpInput name="pin" label={lock ? "Mã PIN mới" : "Mã PIN"} mask disabled={busy} />
        {lock && (
          <>
            <span className="pa-pin-label">Nhập lại mã PIN</span>
            <OtpInput name="confirmation" label="Nhập lại mã PIN" mask autoFocus={false} disabled={busy} />
          </>
        )}
        <p className="pa-otp-hint"><AdminIcon name="lock" size={14} />{lock ? "PIN chỉ dùng trên trình duyệt này và không thay mật khẩu." : "PIN chỉ mở được trên trình duyệt đã bật nó."}</p>
      </div>
      {error && <p className="pa-message" role="alert">{error}</p>}
      <button className="pa-btn" disabled={busy}>{busy ? "Đang xử lý…" : change ? "Lưu PIN mới" : lock ? "Bật PIN và khoá phiên" : "Mở khoá"}</button>
      {onCancel && <button type="button" className="pa-link" disabled={busy} onClick={onCancel}>Huỷ</button>}
      {lock && !change && hasDevicePin && (
        <button type="button" className="pa-btn is-secondary" disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            if (await lockExistingPin()) {
              window.location.assign(new URL("/login/pin", window.location.origin).href);
              return;
            }
            setError("PIN đã lưu không còn hiệu lực cho phiên này. Hãy đặt PIN mới ở trên.");
            setBusy(false);
          }}>
          Khoá ngay bằng PIN đã lưu
        </button>
      )}
      {!lock && <Link className="pa-link" href="/login">Đăng nhập bằng mật khẩu</Link>}
    </form>
  );
}

/** /security/pin: manage PIN for this browser — on/off switch, lock now, change PIN. */
export function PinManager({ enabled }: { enabled: boolean }) {
  const [mode, setMode] = useState<"idle" | "setup" | "change">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function turnOff() {
    if (!window.confirm("Tắt đăng nhập nhanh bằng PIN trên trình duyệt này? Bạn vẫn đang đăng nhập.")) return;
    setBusy(true);
    setError("");
    if (await disablePin()) { window.location.reload(); return; }
    setError("Chưa tắt được PIN. Kiểm tra kết nối rồi thử lại.");
    setBusy(false);
  }
  async function lockNow() {
    setBusy(true);
    setError("");
    if (await lockExistingPin()) { window.location.assign(new URL("/login/pin", window.location.origin).href); return; }
    setError("PIN đã lưu không còn hiệu lực cho phiên này. Hãy đổi PIN để đặt lại.");
    setBusy(false);
  }

  return (
    <div className="pa-form-wrap">
      <div className="pa-pin-status">
        <span className="pa-tile"><AdminIcon name="lock" size={20} /></span>
        <span>
          <b>Đăng nhập nhanh bằng PIN</b>
          <small>{enabled ? "Đang bật trên trình duyệt này · gạt công tắc để tắt" : "Đang tắt · gạt công tắc để bật"}</small>
        </span>
        <label className="pa-switch">
          <span className="ap-sr">{enabled ? "Tắt PIN" : "Bật PIN"}</span>
          <input type="checkbox" role="switch" checked={enabled || mode === "setup"} disabled={busy}
            onChange={(e) => { if (enabled && !e.target.checked) void turnOff(); else if (!enabled) setMode(e.target.checked ? "setup" : "idle"); }} />
          <span aria-hidden="true" />
        </label>
      </div>

      {enabled && mode !== "change" && (
        <div className="pa-pin-actions">
          <button type="button" className="pa-btn" disabled={busy} onClick={lockNow}>Khoá ngay bằng PIN</button>
          <button type="button" className="pa-btn is-secondary" disabled={busy} onClick={() => setMode("change")}>Đổi mã PIN</button>
        </div>
      )}
      {enabled && mode === "change" && <PinForm lock change onCancel={() => setMode("idle")} />}
      {!enabled && mode === "setup" && <PinForm lock onCancel={() => setMode("idle")} />}
      {!enabled && mode === "idle" && <p className="pa-copy">Gạt công tắc để đặt PIN 6 số cho trình duyệt này.</p>}
      {error && <p className="pa-message" role="alert">{error}</p>}
    </div>
  );
}
