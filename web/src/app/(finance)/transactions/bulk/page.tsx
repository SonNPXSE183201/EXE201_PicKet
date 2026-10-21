import { requireApiSession } from "@/core/auth/require-api-session";
import { loadAllTransactions } from "@/core/finance/load-transactions";
import { FinancePageHeader } from "../../finance-ui";
import { BulkArchive } from "./bulk-form";
export default async function BulkPage() {
  const { api, accessToken } = await requireApiSession();
  const rows = await loadAllTransactions(api, accessToken);
  return (
    <>
      <FinancePageHeader
        title="Quản lý nhiều giao dịch"
        description="Chọn tối đa 100 giao dịch để lưu trữ. Mỗi khoản được kiểm tra phiên bản và có kết quả riêng."
      />
      <BulkArchive rows={rows.filter((r) => !r.deletedAt)} />
    </>
  );
}
