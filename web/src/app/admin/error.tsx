"use client";
import { EmptyState, Button } from "@/features/admin/ui/paper";

/* Figma › Admin Web › Lỗi tải dữ liệu. Saved changes are never lost on this screen. */
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div role="alert">
      <EmptyState art="/admin-paper/receipt-scene-v2.webp" code="Không kết nối được API" title="Chưa tải được dữ liệu"
        text="Kết nối hoặc phiên đăng nhập có thể bị gián đoạn. Những thay đổi đã lưu không bị xoá. Kiểm tra mạng rồi thử lại."
        actions={<><Button type="button" onClick={reset}>Thử lại</Button><Button href="/session" variant="secondary">Kiểm tra phiên đăng nhập</Button></>} />
    </div>
  );
}
