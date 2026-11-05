export type AnnouncementKind = "promotion" | "incident" | "maintenance" | "info" | "update";
export type AnnouncementSeverity = "info" | "warning" | "critical";

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  severity: AnnouncementSeverity;
  title: string;
  body: string;
  cta_label: string | null;
  cta_route: string | null;
  cta_url: string | null;
  promotion_id: string | null;
  starts_at: string;
  ends_at: string | null;
  blocking: boolean;
  dismissible: boolean;
  notify: boolean;
  pinned: boolean;
  revision: number;
}

export interface AnnouncementFeed {
  maintenance: { active: boolean; notice: string };
  items: Announcement[];
}

/** A dismissal or notification is remembered per revision, so an edited notice shows again. */
export const announcementKey = (item: Pick<Announcement, "id" | "revision">) =>
  `${item.id}:${item.revision}`;

const live = (item: Announcement, now: number) =>
  Date.parse(item.starts_at) <= now && (!item.ends_at || Date.parse(item.ends_at) > now);

/** Banner/inbox items: live, not dismissed; blocking maintenance is shown as a gate instead. */
export function visibleAnnouncements(
  feed: AnnouncementFeed | null,
  dismissed: ReadonlySet<string>,
  now: number,
): Announcement[] {
  if (!feed) return [];
  return feed.items.filter(
    (item) =>
      live(item, now) &&
      !item.blocking &&
      !(item.dismissible && dismissed.has(announcementKey(item))),
  );
}

/** Blocking maintenance from a published notice or the global maintenance switch. */
export function maintenanceGate(
  feed: AnnouncementFeed | null,
  now: number,
): { title: string; body: string; endsAt: string | null } | null {
  if (!feed) return null;
  const item = feed.items.find((entry) => entry.blocking && live(entry, now));
  if (item) return { title: item.title, body: item.body, endsAt: item.ends_at };
  if (feed.maintenance.active)
    return { title: "", body: feed.maintenance.notice, endsAt: null };
  return null;
}

/** Notices that should raise one device notification: warning/critical, opted in, not yet sent. */
export function announcementsToNotify(
  feed: AnnouncementFeed | null,
  notified: ReadonlySet<string>,
  now: number,
): Announcement[] {
  if (!feed) return [];
  return feed.items.filter(
    (item) =>
      item.notify &&
      item.severity !== "info" &&
      live(item, now) &&
      !notified.has(announcementKey(item)),
  );
}

/** Only in-app routes or Picket HTTPS links can be opened from a notice. */
export function safeAnnouncementTarget(
  item: Pick<Announcement, "cta_route" | "cta_url">,
): { kind: "route"; value: string } | { kind: "url"; value: string } | null {
  if (item.cta_route && /^\/[a-z0-9/_-]{0,80}$/.test(item.cta_route))
    return { kind: "route", value: item.cta_route };
  if (item.cta_url && /^https:\/\/(app\.)?picketfinance\.com(\/[^\s]*)?$/.test(item.cta_url))
    return { kind: "url", value: item.cta_url };
  return null;
}
