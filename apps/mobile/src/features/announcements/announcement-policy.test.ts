import assert from "node:assert/strict";
import { test } from "node:test";
import {
  announcementKey,
  announcementsToNotify,
  maintenanceGate,
  safeAnnouncementTarget,
  visibleAnnouncements,
  type Announcement,
  type AnnouncementFeed,
} from "@picket/domain";

const now = Date.parse("2026-11-05T10:00:00Z");
const item = (patch: Partial<Announcement>): Announcement => ({
  id: "a", kind: "info", severity: "info", title: "T", body: "B", cta_label: null, cta_route: null, cta_url: null,
  promotion_id: null, starts_at: "2026-11-05T09:00:00Z", ends_at: null, blocking: false, dismissible: true,
  notify: false, pinned: false, revision: 1, ...patch,
});
const feed = (items: Announcement[], active = false): AnnouncementFeed => ({ maintenance: { active, notice: "Đang bảo trì" }, items });

test("dismissed notices stay hidden until the admin edits them", () => {
  const a = item({});
  assert.equal(visibleAnnouncements(feed([a]), new Set([announcementKey(a)]), now).length, 0);
  assert.equal(visibleAnnouncements(feed([{ ...a, revision: 2 }]), new Set([announcementKey(a)]), now).length, 1);
  const pinned = item({ id: "p", dismissible: false });
  assert.equal(visibleAnnouncements(feed([pinned]), new Set([announcementKey(pinned)]), now).length, 1);
});

test("expired or future notices are hidden even from a stale cache", () => {
  assert.equal(visibleAnnouncements(feed([item({ ends_at: "2026-11-05T09:30:00Z" })]), new Set(), now).length, 0);
  assert.equal(visibleAnnouncements(feed([item({ starts_at: "2026-11-05T11:00:00Z" })]), new Set(), now).length, 0);
});

test("blocking maintenance becomes a gate; the global switch also gates", () => {
  const m = item({ kind: "maintenance", blocking: true, dismissible: false, title: "Bảo trì" });
  assert.deepEqual(maintenanceGate(feed([m]), now), { title: "Bảo trì", body: "B", endsAt: null });
  assert.equal(visibleAnnouncements(feed([m]), new Set(), now).length, 0);
  assert.deepEqual(maintenanceGate(feed([], true), now), { title: "", body: "Đang bảo trì", endsAt: null });
  assert.equal(maintenanceGate(feed([]), now), null);
});

test("only opted-in warning or critical notices notify, once per revision", () => {
  const w = item({ id: "w", severity: "warning", notify: true });
  assert.deepEqual(announcementsToNotify(feed([w, item({ id: "i", notify: true })]), new Set(), now).map((x) => x.id), ["w"]);
  assert.equal(announcementsToNotify(feed([w]), new Set([announcementKey(w)]), now).length, 0);
});

test("call-to-action targets are limited to app routes and Picket links", () => {
  assert.deepEqual(safeAnnouncementTarget(item({ cta_route: "/billing" })), { kind: "route", value: "/billing" });
  assert.deepEqual(safeAnnouncementTarget(item({ cta_url: "https://app.picketfinance.com/billing" })), { kind: "url", value: "https://app.picketfinance.com/billing" });
  assert.equal(safeAnnouncementTarget(item({ cta_url: "https://evil.example" })), null);
  assert.equal(safeAnnouncementTarget(item({ cta_route: "javascript:alert(1)" })), null);
});
