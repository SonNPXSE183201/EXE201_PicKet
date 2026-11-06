"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/core/supabase/client";

const refreshDelayMs = 350;
const fallbackRefreshMs = 60_000;

const financeRealtimeTables = [
  { ownerColumn: "id", table: "profiles" },
  { ownerColumn: "user_id", table: "user_preferences" },
  { ownerColumn: "user_id", table: "wallets" },
  { ownerColumn: "user_id", table: "categories" },
  { ownerColumn: "user_id", table: "transactions" },
  { ownerColumn: "user_id", table: "transaction_splits" },
  { ownerColumn: "user_id", table: "budgets" },
] as const;

type ConnectionState = "connecting" | "connected" | "fallback";

const connectionLabels: Record<ConnectionState, string> = {
  connected: "Đồng bộ trực tiếp",
  connecting: "Đang kết nối đồng bộ",
  fallback: "Đồng bộ định kỳ",
};

export function FinanceRealtime({ userId }: { userId: string }) {
  const router = useRouter();
  const [connection, setConnection] = useState<ConnectionState>("connecting");

  useEffect(() => {
    const supabase = createClient();
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const refresh = () => {
      if (!disposed) router.refresh();
    };
    const scheduleRefresh = () => {
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refresh, refreshDelayMs);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
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
        scheduleRefresh,
      );
    }

    channel.subscribe((status) => {
      if (!disposed) {
        setConnection(status === "SUBSCRIBED" ? "connected" : "fallback");
      }
    });

    const fallbackTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, fallbackRefreshMs);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      disposed = true;
      if (refreshTimer !== null) clearTimeout(refreshTimer);
      window.clearInterval(fallbackTimer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return (
    <p
      aria-live="polite"
      className={`sync-status sync-status-${connection}`}
      title="Realtime tự làm mới khi dữ liệu thay đổi; kiểm tra định kỳ mỗi 60 giây khi mất kết nối."
    >
      <span aria-hidden="true" className="sync-status-dot" />
      {connectionLabels[connection]}
    </p>
  );
}
