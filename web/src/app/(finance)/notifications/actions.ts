"use server";

import { loadNotificationFeed } from "@/core/finance/load-notification-feed";

export async function loadNotificationFeedAction() {
  return loadNotificationFeed();
}
