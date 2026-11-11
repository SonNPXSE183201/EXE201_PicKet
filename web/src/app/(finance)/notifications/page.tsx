import { loadNotificationFeed } from "@/core/finance/load-notification-feed";
import { FinancePageHeader } from "../finance-ui";
import { NotificationFeed } from "./notification-feed";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ owner, rows, hasPartialData }, params] = await Promise.all([
    loadNotificationFeed(),
    searchParams,
  ]);
  const requestedId = params.notificationId;
  const selectedId = Array.isArray(requestedId)
    ? requestedId[0] ?? null
    : requestedId ?? null;
  return (
    <>
      <FinancePageHeader
        title="Thông báo"
        description="Các kỳ thanh toán, hạn bảo hành và ngân sách cần chú ý."
      />
      {hasPartialData && (
        <p role="status" className="capture-status">
          Chưa tải được một phần thông tin hệ thống hoặc đối tác. Các nhắc việc
          hiện có vẫn hiển thị bên dưới.
        </p>
      )}
      <NotificationFeed
        rows={rows}
        owner={owner}
        selectedId={selectedId}
      />
    </>
  );
}
