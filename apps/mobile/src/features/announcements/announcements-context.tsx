import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import {
  announcementKey,
  announcementsToNotify,
  maintenanceGate,
  visibleAnnouncements,
  type Announcement,
  type AnnouncementFeed,
} from "@picket/domain";
import { picketApi } from "@/core/api/client";
import { useAuth } from "@/features/auth/auth-context";
import { useAppTheme } from "@/features/settings/appearance-provider";
import { getInstalledAppInfo } from "@/features/updates/android-app-updates";

const DISMISSED_KEY = "picket.announcements.dismissed.v1";
const NOTIFIED_KEY = "picket.announcements.notified.v1";
const REFRESH_MS = 5 * 60_000;
const MAX_REMEMBERED = 60;

type AnnouncementsValue = {
  items: Announcement[];
  gate: ReturnType<typeof maintenanceGate>;
  dismiss(item: Announcement): void;
  refresh(): void;
};
const AnnouncementsContext = createContext<AnnouncementsValue>({ items: [], gate: null, dismiss() {}, refresh() {} });

async function readSet(key: string) {
  try {
    const raw = await SecureStore.getItemAsync(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set<string>();
  }
}
const writeSet = (key: string, value: Set<string>) =>
  SecureStore.setItemAsync(key, JSON.stringify([...value].slice(-MAX_REMEMBERED))).catch(() => undefined);

/** Raises one local notification per opted-in notice, only if the user already allowed notifications. */
async function notifyOnce(items: Announcement[], notified: Set<string>) {
  if (!items.length) return;
  const permission = await Notifications.getPermissionsAsync().catch(() => null);
  if (!permission?.granted) return;
  await Notifications.setNotificationChannelAsync("picket-announcements", {
    name: "Picket", importance: Notifications.AndroidImportance.DEFAULT,
  }).catch(() => undefined);
  for (const item of items) {
    await Notifications.scheduleNotificationAsync({
      identifier: `announcement-${announcementKey(item)}`,
      content: { title: item.title, body: item.body.slice(0, 180), data: { announcementId: item.id } },
      trigger: { channelId: "picket-announcements" } as Notifications.NotificationTriggerInput,
    }).catch(() => undefined);
    notified.add(announcementKey(item));
  }
  await writeSet(NOTIFIED_KEY, notified);
}

export function AnnouncementsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { language } = useAppTheme();
  const token = session?.access_token ?? null;
  const [feed, setFeed] = useState<AnnouncementFeed | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const notified = useRef<Set<string> | null>(null);
  const revision = useRef(0);

  const refresh = useCallback(() => {
    if (!picketApi) return;
    const current = ++revision.current;
    const installed = getInstalledAppInfo();
    void picketApi
      .announcements({
        channel: installed?.playStore ? "play" : "apk",
        versionCode: installed?.versionCode,
        locale: language,
      }, token)
      .then(async (next) => {
        if (current !== revision.current) return;
        setFeed(next);
        setNow(Date.now());
        notified.current ??= await readSet(NOTIFIED_KEY);
        await notifyOnce(announcementsToNotify(next, notified.current, Date.now()), notified.current);
      })
      .catch(() => {
        /* Keep the last feed; notices are advisory and the app works offline. */
      });
  }, [language, token]);

  useEffect(() => {
    void readSet(DISMISSED_KEY).then(setDismissed);
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);

  const dismiss = useCallback((item: Announcement) => {
    if (!item.dismissible) return;
    setDismissed((previous) => {
      const next = new Set(previous).add(announcementKey(item));
      void writeSet(DISMISSED_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<AnnouncementsValue>(() => ({
    items: visibleAnnouncements(feed, dismissed, now),
    gate: maintenanceGate(feed, now),
    dismiss,
    refresh,
  }), [dismiss, dismissed, feed, now, refresh]);
  return <AnnouncementsContext.Provider value={value}>{children}</AnnouncementsContext.Provider>;
}

export const useAnnouncements = () => useContext(AnnouncementsContext);
