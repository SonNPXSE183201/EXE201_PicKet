import Link from "next/link";

export function FinancePageHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="finance-page-heading">
      <div>
        <h1 className="finance-title">{title}</h1>
        <p>{description}</p>
      </div>
      <Link className="button secondary" href="/dashboard">
        Về tổng quan
      </Link>
    </div>
  );
}

export function MutationError({ visible }: { visible: boolean }) {
  return visible ? (
    <p className="mutation-error" role="alert">
      Không lưu được thay đổi. Dữ liệu có thể đã được cập nhật trên thiết bị
      khác; hãy tải lại và thử lại.
    </p>
  ) : null;
}
