"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/core/supabase/client";
import { refreshFinance } from "./refresh-finance";

const refreshDelayMs = 350;
const fallbackRefreshMs = 60_000;
const warmBatch = 2;
const warmGapMs = 1000;

const financeRealtimeTables = [
  { ownerColumn: "id", table: "profiles" },
  { ownerColumn: "user_id", table: "user_preferences" },
  { ownerColumn: "user_id", table: "wallets" },
  { ownerColumn: "user_id", table: "categories" },
  { ownerColumn: "user_id", table: "transactions" },
  { ownerColumn: "user_id", table: "transaction_splits" },
  { ownerColumn: "user_id", table: "budgets" },
] as const;

const affectedScreensByTable: Record<string, readonly string[]> = {
  profiles: ["/dashboard", "/profile", "/accounts"],
  user_preferences: ["/profile", "/dashboard"],
  wallets: ["/dashboard", "/accounts", "/transactions", "/insights", "/reconcile"],
  categories: ["/dashboard", "/categories", "/transactions", "/budgets", "/insights"],
  transactions: ["/dashboard", "/transactions", "/accounts", "/budgets", "/planning", "/insights", "/receipts", "/keepsakes"],
  transaction_splits: ["/dashboard", "/transactions", "/budgets", "/planning", "/insights"],
  budgets: ["/dashboard", "/budgets", "/planning", "/insights"],
};

type ConnectionState = "connecting" | "connected" | "fallback";

const connectionLabels: Record<ConnectionState, string> = {
  connected: "Đồng bộ trực tiếp",
  connecting: "Đang kết nối đồng bộ",
  fallback: "Đồng bộ định kỳ",
};

export function FinanceRealtime({
  userId,
  screens,
  showStatus = true,
}: {
  userId: string;
  screens: readonly string[];
  showStatus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [waiting, setWaiting] = useState(false);
  const currentPath = useRef(pathname);
  const stale = useRef(new Set<string>());
  const refreshCurrent = useRef<() => void>(() => undefined);
  const screensKey = screens.join("|");
  const targets = useMemo(() => screensKey.split("|").filter(Boolean), [screensKey]);

  useEffect(() => {
    currentPath.current = pathname;
    const currentScreen = screenForPath(pathname, targets);
    if (!currentScreen || !stale.current.has(currentScreen)) return;
    stale.current.delete(currentScreen);
    const timer = setTimeout(() => refreshCurrent.current(), 150);
    return () => clearTimeout(timer);
  }, [pathname, targets]);

  // Warm the main user routes during idle time; navigation then displays the
  // App Router's cached payload immediately instead of waiting for each API call.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const start = () => {
      if (cancelled) return;
      // Do not compete with the screen the user is already opening, or fill a
      // metered connection with eleven background route requests.
      const network = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }).connection;
      if (network?.saveData || /^(slow-)?2g$/.test(network?.effectiveType ?? "")) return;
      targets.filter((href) => href !== currentPath.current).forEach((href, index) => {
        timers.push(
          setTimeout(
            () => {
              if (!cancelled) prefetchFull(router, href);
            },
            Math.floor(index / warmBatch) * warmGapMs,
          ),
        );
      });
    };
    const idle = (
      window as Window & {
        requestIdleCallback?: (
          callback: () => void,
          options?: { timeout: number },
        ) => number;
      }
    ).requestIdleCallback;
    if (idle) idle(start, { timeout: 2500 });
    else timers.push(setTimeout(start, 1200));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [router, targets]);

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let deferred = false;
    let refreshing = false;
    let refreshAgain = false;

    const refresh = () => {
      if (disposed) return;
      if (document.visibilityState !== "visible") {
        deferred = true;
        return;
      }
      if (isEditing(document.activeElement as HTMLElement | null)) {
        deferred = true;
        setWaiting(true);
        return;
      }
      deferred = false;
      setWaiting(false);
      if (refreshing) {
        refreshAgain = true;
        return;
      }
      refreshing = true;
      // The action expires this session's shared reads and streams the current
      // screen back in the same response. Avoid a second router.refresh request.
      void refreshFinance().catch(() => {
        if (disposed) return;
        deferred = true;
        setWaiting(true);
        setConnection("fallback");
      }).finally(() => {
        refreshing = false;
        if (!disposed && refreshAgain) {
          refreshAgain = false;
          scheduleRefresh();
        }
      });
    };
    refreshCurrent.current = refresh;

    const scheduleRefresh = () => {
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refresh, refreshDelayMs);
    };
    const onFocusOut = () => {
      if (deferred) setTimeout(refresh, 150);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && deferred) refresh();
    };

    let channel = supabase.channel(`web-finance-sync-${userId}`);
    for (const subscription of financeRealtimeTables) {
      channel = channel.on(
        "postgres_changes",
        {
          event: "*",
          filter: `${subscription.ownerColumn}=eq.${userId}`,
          schema: "public",
          table: subscription.table,
        },
        () => {
          const activePath = currentPath.current;
          const activeScreen = screenForPath(activePath, targets);
          const affected = affectedScreensByTable[subscription.table] ?? [];
          for (const target of targets) {
            if (
              target !== activeScreen &&
              affected.some((href) => target === href || target.startsWith(`${href}/`))
            ) stale.current.add(target);
          }
          if (affected.some((href) => activePath === href || activePath.startsWith(`${href}/`))) {
            scheduleRefresh();
          }
        },
      );
    }

    channel.subscribe((status) => {
      if (!disposed) {
        setConnection(
          status === "SUBSCRIBED"
            ? "connected"
            : status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "fallback"
              : "connecting",
        );
      }
    });

    const fallbackTimer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        (channel.state !== "joined" || deferred)
      ) {
        refresh();
      }
    }, fallbackRefreshMs);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      window.clearInterval(fallbackTimer);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [targets, userId]);

  return (
    <>
      {showStatus && (
        <p
          aria-live="polite"
          className={`sync-status sync-status-${connection}`}
          title="Dữ liệu tự làm mới khi có thay đổi; kiểm tra định kỳ khi mất kết nối."
        >
          <span aria-hidden="true" className="sync-status-dot" />
          {connectionLabels[connection]}
        </p>
      )}
      {waiting && showStatus && (
        <button
          type="button"
          className="finance-live-update"
          onClick={() => {
            setWaiting(false);
            refreshCurrent.current();
          }}
        >
          Có dữ liệu mới · Cập nhật
        </button>
      )}
    </>
  );
}

function screenForPath(pathname: string, targets: string[]) {
  return targets
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((left, right) => right.length - left.length)[0];
}

function isEditing(active: HTMLElement | null) {
  if (!active?.tagName) return false;
  if (active.isContentEditable) return true;
  const tag = active.tagName.toUpperCase();
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (active as HTMLInputElement).type;
  return ![
    "button",
    "submit",
    "reset",
    "checkbox",
    "radio",
    "range",
    "color",
    "file",
    "hidden",
  ].includes(type);
}

function prefetchFull(router: ReturnType<typeof useRouter>, href: string) {
  (
    router.prefetch as (
      path: string,
      options?: { kind?: "full" },
    ) => void
  )(href, { kind: "full" });
}
