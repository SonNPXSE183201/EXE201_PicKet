import { supabase } from "@/core/supabase/client";
import { financeRealtimeTables, nextFinanceChannelName } from "@/core/sync/finance-realtime-policy";

export type FinanceRealtimeConnection = "connected" | "disconnected";

export function subscribeToFinanceChanges(input: {
  userId: string;
  onChange(tables: string[]): void;
  onConnectionChange?(connection: FinanceRealtimeConnection): void;
}) {
  const client = supabase;
  if (!client) return () => undefined;

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let active = true;
  const pendingTables = new Set<string>();
  const scheduleRefresh = (table: string) => {
    if (!active) return;
    pendingTables.add(table);
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (!active) return;
      const tables = [...pendingTables];
      pendingTables.clear();
      input.onChange(tables);
    }, 350);
  };
  let channel = client.channel(nextFinanceChannelName(input.userId));

  for (const subscription of financeRealtimeTables) {
    channel = channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: subscription.table,
        filter: `${subscription.ownerColumn}=eq.${input.userId}`,
      },
      () => scheduleRefresh(subscription.table),
    );
  }

  channel.subscribe((status) => {
    if (!active) return;
    input.onConnectionChange?.(
      status === "SUBSCRIBED" ? "connected" : "disconnected",
    );
  });

  return () => {
    if (!active) return;
    active = false;
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    input.onConnectionChange?.("disconnected");
    void client.removeChannel(channel).catch(() => undefined);
  };
}
