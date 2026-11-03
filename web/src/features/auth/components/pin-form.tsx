"use client";
import { useState } from "react";
import Link from "next/link";
import { lockWithPin, unlockWithPin, lockExistingPin } from "../pin-actions";
export function PinForm({ lock = false }: { lock?: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="auth-form"
      aria-busy={busy}
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        const success = await (lock ? lockWithPin(form) : unlockWithPin(form));
        if (success) {
          window.location.assign(lock ? "/login/pin" : "/session");
          return;
        }
        setError(
          lock
            ? "Chưa bật được PIN. Hãy đăng nhập bằng mật khẩu trong 10 phút gần đây và kiểm tra PIN xác nhận."
            : "PIN chưa đúng hoặc phiên đã hết hiệu lực. Sau nhiều lần sai, cần chờ 15 phút hoặc đăng nhập bằng mật khẩu.",
        );
        setBusy(false);
      }}
    >
      <label>
        PIN 6 số
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]{6}"
          minLength={6}
          maxLength={6}
          autoComplete="off"
          required
        />
      </label>
      {lock && (
        <label>
          Nhập lại PIN
          <input
            name="confirmation"
            type="password"
            inputMode="numeric"
            pattern="[0-9]{6}"
            minLength={6}
            maxLength={6}
            autoComplete="off"
            required
          />
        </label>
      )}
      {error && <p role="alert">{error}</p>}
      <button className="button primary" disabled={busy}>
        {busy ? "Đang xử lý…" : lock ? "Bật PIN và khóa phiên" : "Mở khóa"}
      </button>
      {lock && (
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            if (await lockExistingPin()) {
              // Reload the document to discard the browser Auth SDK's cached session.
              window.location.assign(
                new URL("/login/pin", window.location.origin).href,
              );
              return;
            }
            setError(
              "Chưa có PIN hợp lệ cho phiên này. Hãy bật PIN sau khi đăng nhập bằng mật khẩu.",
            );
            setBusy(false);
          }}
        >
          Khóa bằng PIN đã lưu
        </button>
      )}
      <Link href="/login">Đăng nhập bằng mật khẩu</Link>
    </form>
  );
}
