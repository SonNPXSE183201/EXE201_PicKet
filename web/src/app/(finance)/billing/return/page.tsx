import Link from "next/link";
import { requireApiSession } from "@/core/auth/require-api-session";
import { PaymentPanel } from "@/features/billing/payment-panel";
import { AppHandoff } from "./app-handoff";

const ORDER_ID = /^[a-f0-9-]{36}$/i;

export default async function PaymentReturn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { api, accessToken } = await requireApiSession();
  const { orderId, app } = await searchParams;
  const id = orderId && ORDER_ID.test(orderId) ? orderId : undefined;
  // A checkout started in the mobile app goes back to the app, which re-reads the order itself.
  if (app === "1" && id) return <AppHandoff orderId={id} />;
  const [data, entitlements] = await Promise.all([
    api.paymentCustomer(accessToken, id),
    api.currentEntitlements(accessToken),
  ]);
  return (
    <>
      <h1>Kết quả thanh toán</h1>
      <p>
        Hệ thống đang kiểm tra giao dịch với nhà cung cấp và sẽ cập nhật gói
        {entitlements.tier !== "free" ? ` ${entitlements.tier.toUpperCase()}` : ""} của bạn.
      </p>
      <PaymentPanel initial={data} paid={entitlements.tier !== "free"} autoVerifyId={id} />
      <Link href="/billing">Về gói của bạn</Link>
    </>
  );
}
