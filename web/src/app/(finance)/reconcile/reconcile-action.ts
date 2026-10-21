"use server";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/core/auth/require-api-session";
import {
  latestStatementDay,
  validStatementDay,
} from "@/core/finance/reconciliation-policy";
import { ApiError } from "@picket/api-client";
export async function reconcile(
  _previous: { message: string; done: boolean },
  form: FormData,
): Promise<{ done: boolean; message: string; retryable?: boolean }> {
  const { api, accessToken } = await requireApiSession();
  const statementBalance = Number(form.get("statementBalance")),
    reason = String(form.get("reason") ?? "").trim(),
    requestId = String(form.get("requestId") ?? ""),
    statementDate = String(form.get("statementDate") ?? "");
  if (
    !Number.isSafeInteger(statementBalance) ||
    Math.abs(statementBalance) > 9e12 ||
    reason.length > 1000 ||
    !/^[0-9a-f-]{36}$/i.test(requestId) ||
    !validStatementDay(statementDate, latestStatementDay()) ||
    form.get("confirmation") !== "RECONCILE"
  )
    return {
      done: false,
      retryable: false,
      message:
        "Kiểm tra số dư, lý do và xác nhận. Ngày sao kê không được sau ngày hiện tại theo đồng hồ máy chủ (UTC).",
    };
  try {
    const selectedTransactionIds = form
      .getAll("selectedTransactionIds")
      .map(String);
    if (
      selectedTransactionIds.length > 10000 ||
      selectedTransactionIds.some((id) => !/^[a-f0-9-]{36}$/i.test(id))
    )
      return {
        done: false,
        retryable: false,
        message: "Danh sách giao dịch không hợp lệ.",
      };
    const result = await api.reconcileWallet(accessToken, {
      requestId,
      accountId: String(form.get("accountId")),
      statementDate,
      statementBalance,
      selectedTransactionIds,
      reason,
    });
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return {
      done: true,
      message: `Đã đối soát. Chênh lệch ${result.difference.toLocaleString("vi-VN")} theo tiền tệ của ví${result.replayed ? " (yêu cầu đã xử lý trước đó)" : ""}.`,
    };
  } catch (error) {
    if (
      error instanceof ApiError &&
      [400, 403, 404, 422].includes(error.status)
    )
      return {
        done: false,
        retryable: false,
        message:
          "Máy chủ từ chối yêu cầu và chưa ghi thay đổi. Kiểm tra ngày sao kê, ví và giao dịch đã chọn trước khi gửi lại.",
      };
    return {
      done: false,
      message:
        "Chưa nhận được xác nhận. Giữ nguyên dữ liệu và thử lại để tránh tạo yêu cầu mới.",
    };
  }
}
