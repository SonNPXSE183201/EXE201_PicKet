"use client";
import { useEffect } from "react";

const APP_SCHEME = "com.picket.mobile";

/** Hands the customer back to the PicKet app after PayOS, then offers a manual button. */
export function AppHandoff({ orderId }: { orderId: string }) {
  const target = `${APP_SCHEME}://billing?orderId=${encodeURIComponent(orderId)}`;
  useEffect(() => {
    window.location.replace(target);
  }, [target]);
  return (
    <>
      <h1>Đang quay lại ứng dụng PicKet…</h1>
      <p>Ứng dụng sẽ kiểm tra thanh toán và cập nhật gói của bạn.</p>
      <a className="button" href={target}>Mở ứng dụng PicKet</a>
    </>
  );
}
