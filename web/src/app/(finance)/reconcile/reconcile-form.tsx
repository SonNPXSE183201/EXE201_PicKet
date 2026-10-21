"use client";
import { useEffect, useState } from "react";
import type { FinancialAccount, Transaction } from "@picket/domain";
import { reconcile } from "./reconcile-action";
type Pending = {
  requestId: string;
  accountId: string;
  statementDate: string;
  statementBalance: string;
  reason: string;
  selectedTransactionIds: string[];
  confirmation: string;
};
export function ReconcileForm({
  accounts,
  transactions,
  requestId,
  owner,
  maxDate,
}: {
  accounts: FinancialAccount[];
  transactions: Transaction[];
  requestId: string;
  owner: string;
  maxDate:string;
}) {
  const [state, setState] = useState({ message: "", done: false }),
    [pending, setPending] = useState(false),
    [saved, setSaved] = useState<Pending | null>(null),
    [wallet, setWallet] = useState(accounts[0]?.id ?? "");
  const key = "picket-web.reconcile." + owner;
  useEffect(() => {
    Promise.resolve().then(() => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const value = JSON.parse(raw) as Pending;
        if (!value.requestId || !accounts.some((a) => a.id === value.accountId))
          return;
        setSaved(value);
        setWallet(value.accountId);
        setState({
          done: false,
          message:
            "Có yêu cầu chưa nhận được xác nhận. Tiếp tục yêu cầu cũ để tránh tạo điều chỉnh trùng.",
        });
      } catch {
        setState({
          done: false,
          message:
            "Không đọc được yêu cầu đối soát tạm. Hãy kiểm tra dữ liệu trước khi đối soát mới.",
        });
      }
    });
  }, [key, accounts]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || state.done) return;
    const form = new FormData(e.currentTarget);
    const value: Pending = saved ?? {
      requestId,
      accountId: String(form.get("accountId")),
      statementDate: String(form.get("statementDate")),
      statementBalance: String(form.get("statementBalance")),
      reason: String(form.get("reason")),
      confirmation: String(form.get("confirmation")),
      selectedTransactionIds: form.getAll("selectedTransactionIds").map(String),
    };
    setPending(true);
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setSaved(value);
      const data = new FormData();
      for (const [k, v] of Object.entries(value)) {
        if (Array.isArray(v)) for (const id of v) data.append(k, id);
        else data.set(k, v);
      }
      const result = await reconcile(state, data);
      setState(result);
      if (result.done || result.retryable===false) {
        localStorage.removeItem(key);
        setSaved(null);
      }
    } catch {
      setState({
        done: false,
        message:
          "Chưa gửi hoặc chưa nhận được xác nhận. Yêu cầu tạm được giữ riêng theo tài khoản trên trình duyệt này. Kiểm tra kết nối rồi tiếp tục, không tạo mã mới.",
      });
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="finance-form">
      <h2>Đối chiếu với sao kê</h2>
      {saved ? (
        <section className="capture-status">
          <h3>Tiếp tục yêu cầu đang chờ</h3>
          <p>
            Ví: {accounts.find((a) => a.id === saved.accountId)?.name} ·{" "}
            {saved.statementDate}
          </p>
          <p>
            Số dư sao kê:{" "}
            {Number(saved.statementBalance).toLocaleString("vi-VN")}
          </p>
          <p>{saved.reason}</p>
          <p>Nội dung yêu cầu đã gửi được giữ nguyên khi thử lại.</p>
        </section>
      ) : (
        <>
          <label>
            Ví
            <select
              name="accountId"
              required
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            >
              {accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ngày sao kê
            <input
              type="date"
              name="statementDate"
              required
              defaultValue={maxDate}
              max={maxDate}
            />
          </label>
          <label>
            Số dư trên sao kê
            <input
              type="number"
              step="1"
              inputMode="numeric"
              name="statementBalance"
              required
            />
          </label>
          <label>
            Lý do
            <textarea name="reason" required maxLength={1000} rows={3} />
          </label>
          <details>
            <summary>Chọn giao dịch đã khớp sao kê</summary>
            {transactions
              .filter(
                (t) =>
                  !t.deletedAt &&
                  (t.accountId === wallet ||
                    t.destinationAccountId === wallet) &&
                  !t.reconciledAccountIds?.includes(wallet),
              )
              .map((t) => (
                <label className="checkbox-label" key={t.id}>
                  <input
                    type="checkbox"
                    name="selectedTransactionIds"
                    value={t.id}
                  />
                  {t.title} · {t.amount.toLocaleString("vi-VN")}
                </label>
              ))}
          </details>
          <p>
            Thao tác có thể tạo giao dịch điều chỉnh. Yêu cầu chờ được lưu tạm
            trong trình duyệt theo tài khoản để thử lại với cùng mã và nội dung.
          </p>
          <label>
            Nhập RECONCILE để xác nhận
            <input
              name="confirmation"
              pattern="RECONCILE"
              required
              autoComplete="off"
            />
          </label>
        </>
      )}
      {state.message && (
        <p
          role={state.done ? "status" : "alert"}
          className={state.done ? "admin-success" : "mutation-error"}
        >
          {state.message}
        </p>
      )}
      <button
        className="button primary"
        disabled={pending || state.done || !accounts.length}
      >
        {pending
          ? "Đang đối soát…"
          : state.done
            ? "Đã đối soát"
            : saved
              ? "Tiếp tục cùng yêu cầu"
              : "Xác nhận đối soát"}
      </button>
    </form>
  );
}
