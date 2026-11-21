"use client";

import { useState } from "react";

import { SubmitButton } from "@/core/ui/submit-button";
import { AdminIcon } from "../ui/admin-icon";
import { Field } from "../ui/paper";
import type { VerificationSettingsView } from "../views/shared";

/* "Xác thực đăng ký": which channels send the 6-digit sign-up code. At least one must stay on. */
export function VerificationSettingsForm({ settings, disabled, action }: {
  settings: VerificationSettingsView["settings"];
  disabled: boolean;
  action: (form: FormData) => Promise<void>;
}) {
  const [email, setEmail] = useState(settings.emailEnabled);
  const [sms, setSms] = useState(settings.smsEnabled);
  const noChannel = !email && !sms;
  return (
    <form action={action} className="av-form">
      <fieldset disabled={disabled}>
        <input type="hidden" name="revision" value={settings.revision} />
        <div className="av-switches">
          <label className="av-switch-row">
            <span><b>Email OTP</b><small>Mã 6 số gửi qua email (Supabase). Mặc định bật.</small></span>
            <span className="ap-switch"><input type="checkbox" name="emailEnabled" checked={email} onChange={(e) => setEmail(e.target.checked)} /><span /></span>
          </label>
          <label className="av-switch-row">
            <span><b>SMS OTP (Firebase)</b><small>Mã 6 số gửi qua SMS bằng Firebase Phone Auth. Có chi phí theo tin nhắn.</small></span>
            <span className="ap-switch"><input type="checkbox" name="smsEnabled" checked={sms} onChange={(e) => setSms(e.target.checked)} /><span /></span>
          </label>
        </div>
        {!email && !noChannel && (
          <p className="ao-warn" role="status"><AdminIcon name="alert" size={18} />Bản app cũ chỉ hỗ trợ email. Tắt email sẽ khiến người dùng bản cũ không đăng ký được.</p>
        )}
        {noChannel && <p className="av-error" role="alert">Cần bật ít nhất một kênh xác thực.</p>}
        <div className="av-fields">
          <Field label="Giới hạn SMS mỗi ngày"><input name="smsDailyLimit" type="number" min={0} max={100000} step={1} required defaultValue={settings.smsDailyLimit} /></Field>
          <Field label="Lý do thay đổi" grow><input name="reason" minLength={5} maxLength={500} required placeholder="Ví dụ: mở SMS cho đợt ra mắt" /></Field>
        </div>
        <SubmitButton className="ap-btn" disabled={noChannel}>Lưu cấu hình xác thực</SubmitButton>
      </fieldset>
    </form>
  );
}
