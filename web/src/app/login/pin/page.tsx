import { PinForm } from "@/features/auth/components/pin-form";
export default function PinLoginPage() {
  return (
    <main className="auth-card">
      <h1>Mở khóa bằng PIN</h1>
      <p>
        Dùng trên trình duyệt bạn đã bật PIN. PIN không thay thế mật khẩu tài
        khoản.
      </p>
      <PinForm />
    </main>
  );
}
