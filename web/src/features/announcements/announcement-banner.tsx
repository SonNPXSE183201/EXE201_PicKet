import Link from "next/link";
import {
  safeAnnouncementTarget,
  type AnnouncementFeed,
} from "@picket/domain";
import type { PicketApiClient } from "@picket/api-client";

/** Live notices for the web channel; failures never block the workspace. */
export async function AnnouncementBanner({
  api,
  accessToken,
}: {
  api: PicketApiClient;
  accessToken: string;
}) {
  let feed: AnnouncementFeed | null = null;
  try {
    feed = await api.announcements({ channel: "web", locale: "vi" }, accessToken);
  } catch {
    return null;
  }
  const items = feed.items.slice(0, 3);
  const maintenance = feed.maintenance.active || items.some((i) => i.blocking);
  if (!items.length && !maintenance) return null;
  return (
    <section className="announcement-stack" aria-label="Thông báo từ Picket">
      {feed.maintenance.active && !items.some((i) => i.blocking) && (
        <p role="alert" className="announcement announcement-critical">
          <strong>Picket đang bảo trì.</strong> {feed.maintenance.notice}
        </p>
      )}
      {items.map((item) => {
        const target = safeAnnouncementTarget(item);
        return (
          <p
            key={item.id}
            role={item.severity === "info" ? "status" : "alert"}
            className={`announcement announcement-${item.severity}`}
          >
            <strong>{item.title}</strong> {item.body}{" "}
            {target?.kind === "route" && (
              <Link href={target.value}>{item.cta_label ?? "Xem chi tiết"}</Link>
            )}
            {target?.kind === "url" && (
              <a href={target.value} rel="noopener">
                {item.cta_label ?? "Xem chi tiết"}
              </a>
            )}
          </p>
        );
      })}
    </section>
  );
}
