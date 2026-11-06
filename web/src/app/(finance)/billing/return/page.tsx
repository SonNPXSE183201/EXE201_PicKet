import Link from "next/link";
import { requireApiSession } from "@/core/auth/require-api-session";
import { PaymentPanel } from "@/features/billing/payment-panel";
export default async function PaymentReturn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { api, accessToken } = await requireApiSession();
  const { orderId } = await searchParams;
  const data = await api.paymentCustomer(
    accessToken,
    orderId && /^[a-f0-9-]{36}$/i.test(orderId) ? orderId : undefined,
  );
  return (
    <>
      <h1>Kết quả thanh toán</h1>
      <p>
        Hệ thống kiểm tra giao dịch với nhà cung cấp. Nếu vừa chuyển khoản, chọn
        kiểm tra thanh toán.
      </p>
      <PaymentPanel initial={data} paid={false} />
      <Link href="/billing">Về gói của bạn</Link>
    </>
  );
}
