import { requireApiSession } from "@/core/auth/require-api-session";
import { PinManager } from "@/features/auth/components/pin-form";
import { hasPinDevice } from "@/features/auth/pin-device";
import "@/features/auth/paper-auth.css";

/* Turn on PIN quick unlock for this browser (account menu → Đăng nhập nhanh bằng PIN). */
export default async function PinSettings() {
  await requireApiSession();
  const hasDevicePin = await hasPinDevice();
  return (
    <article className="data-panel pa-root is-inline">
      <header className="pa-head">
        <p className="pa-eyebrow">Bảo mật</p>
        <h1 className="pa-title">Đăng nhập nhanh bằng PIN</h1>
        <p className="pa-copy">Mở lại Picket bằng PIN 6 số trên trình duyệt này, không cần nhập lại mật khẩu.</p>
      </header>
      <PinManager enabled={hasDevicePin} />
      {!hasDevicePin && (
        <ol className="pa-steps">
          <li><b>Đặt PIN 6 số</b> và nhập lại để xác nhận.</li>
          <li>Picket <b>khoá phiên hiện tại</b> và chuyển sang màn mở khoá.</li>
          <li>Lần sau, chọn <b>Mở khoá nhanh bằng PIN</b> ở trang đăng nhập (hiệu lực 30 ngày).</li>
        </ol>
      )}
      <p className="pa-meta" style={{ justifySelf: "start", textAlign: "left" }}>
        Bật hoặc đổi PIN cần đăng nhập bằng mật khẩu trong 10 phút gần đây. Chỉ bật trên máy tính riêng; đăng xuất sẽ thu hồi PIN của trình duyệt này.
      </p>
    </article>
  );
}
