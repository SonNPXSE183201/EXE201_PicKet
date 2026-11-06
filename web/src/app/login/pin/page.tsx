import Link from "next/link";
import { PaperAuthShell } from "@/features/auth/components/paper-auth-shell";
import { PinForm } from "@/features/auth/components/pin-form";
import { hasPinDevice } from "@/features/auth/pin-device";

/* Quick unlock with the 6-digit PIN saved on this browser. */
export default async function PinLoginPage() {
  const available = await hasPinDevice();
  return (
    <PaperAuthShell>
      <div className="auth-card">
        <header className="pa-head">
          <p className="pa-eyebrow">Mở khoá nhanh</p>
          <h1 className="pa-title">{available ? "Nhập mã PIN" : "Trình duyệt này chưa bật PIN"}</h1>
          <p className="pa-copy">
            {available
              ? "Nhập PIN 6 số bạn đã đặt trên trình duyệt này để vào lại Picket mà không cần mật khẩu."
              : "PIN giúp bạn mở lại Picket nhanh trên máy tính riêng. Bật một lần, dùng trong 30 ngày."}
          </p>
        </header>
        {available ? (
          <PinForm />
        ) : (
          <div className="pa-form-wrap">
            <ol className="pa-steps">
              <li><b>Đăng nhập bằng mật khẩu</b> trên trình duyệt này.</li>
              <li>Mở menu tài khoản → <b>Đăng nhập nhanh bằng PIN</b>.</li>
              <li>Đặt PIN 6 số. Lần sau chỉ cần nhập PIN để vào lại.</li>
            </ol>
            <Link className="pa-btn" href="/login">Đăng nhập bằng mật khẩu</Link>
            <p className="pa-meta">Đăng xuất sẽ xoá PIN của trình duyệt này. Không bật PIN trên máy dùng chung.</p>
          </div>
        )}
      </div>
    </PaperAuthShell>
  );
}
