import Link from "next/link";

import { FinancePageHeader } from "../finance-ui";
import { deleteAccount } from "./actions";
import { RestoreForm } from "./restore-form";

interface PageProps { searchParams: Promise<{ error?: string }> }

export default async function DataPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  return (
    <>
      <FinancePageHeader title="Dữ liệu của bạn" description="Tải bản sao JSON có phiên bản để lưu trữ hoặc kiểm tra dữ liệu Picket của bạn." />
      <article className="operation-card">
        <div className="operation-summary">
          <strong>Export Picket JSON</strong>
          <span>Bản export gồm hồ sơ tài chính, ví, giao dịch, phân bổ, ngân sách và các dữ liệu kế hoạch hiện có. File không bao gồm mật khẩu hoặc access token.</span>
        </div>
        <a className="button primary" download href="/api/export">Tải bản export</a>
        <p className="data-warning">File có thể chứa dữ liệu tài chính nhạy cảm. Chỉ lưu tại thiết bị hoặc dịch vụ lưu trữ mà bạn tin cậy.</p>
        <Link className="back-link" href="/profile">Quay lại hồ sơ</Link>
      </article>
      <article className="operation-card">
        <div className="operation-summary"><strong>Khôi phục backup</strong><span>File được validate trước. Restore dùng revision hiện tại và chạy trong transaction; nếu dữ liệu đã thay đổi hoặc một bản ghi lỗi, toàn bộ thao tác sẽ rollback.</span></div>
        <RestoreForm />
      </article>
      <article className="operation-card danger-zone">
        <div className="operation-summary"><strong>Xóa tài khoản vĩnh viễn</strong><span>Ảnh riêng tư, dữ liệu tài chính và tài khoản đăng nhập sẽ bị xóa. Thao tác không thể hoàn tác và yêu cầu bạn vừa đăng nhập lại trong vòng 5 phút.</span></div>
        {error === "confirmation" && <p className="mutation-error" role="alert">Hãy nhập chính xác DELETE để xác nhận.</p>}
        {error === "delete_failed" && <p className="mutation-error" role="alert">Không thể xóa tài khoản. Hãy đăng xuất, đăng nhập lại rồi thử trong vòng 5 phút.</p>}
        <form action={deleteAccount} className="finance-form">
          <label>Nhập DELETE để xác nhận<input autoComplete="off" name="confirmation" pattern="DELETE" required /></label>
          <button className="button destructive" type="submit">Xóa vĩnh viễn tài khoản</button>
        </form>
      </article>
    </>
  );
}
