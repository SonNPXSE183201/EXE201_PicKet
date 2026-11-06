/* Skeleton in the admin Paper layout while a section loads. */
export default function Loading() {
  return (
    <div className="ap-grid ap-grid-4" role="status" aria-busy="true" aria-label="Đang tải không gian quản trị">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="ap-card is-receipt ap-skeleton" style={{ minHeight: 140 }} />
      ))}
    </div>
  );
}
