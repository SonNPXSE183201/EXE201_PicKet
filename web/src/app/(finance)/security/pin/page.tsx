import { requireApiSession } from "@/core/auth/require-api-session";
import { PinForm } from "@/features/auth/components/pin-form";
export default async function PinSettings() {
  await requireApiSession();
  return (
    <article className="data-panel">
      <h1>Đăng nhập nhanh bằng PIN</h1>
      <p>
        Chỉ bật trên trình duyệt riêng của bạn, ngay sau khi đăng nhập bằng mật
        khẩu. Hệ thống sẽ khóa phiên hiện tại; bạn có thể mở lại bằng PIN 6 số.
        Khi đăng xuất, quyền dùng PIN của phiên này được thu hồi.
      </p>
      <PinForm lock />
    </article>
  );
}
