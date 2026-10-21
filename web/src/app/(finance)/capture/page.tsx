import { requireApiSession } from "@/core/auth/require-api-session";
import { FinancePageHeader } from "../finance-ui";
import { CaptureForm } from "./capture-form";
import { vietnamDate } from "@/core/finance/overview";
export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { claims } = await requireApiSession();
  const { date } = await searchParams;
  const initialDate =
    date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
      ? date
      : vietnamDate(new Date().toISOString());
  return (
    <>
      <FinancePageHeader
        title="Lưu hóa đơn"
        description="Chụp hoặc chọn ảnh, kiểm tra nội dung rồi lưu vào bộ sưu tập riêng của bạn."
      />
      <CaptureForm owner={String(claims.sub)} initialDate={initialDate} />
    </>
  );
}
