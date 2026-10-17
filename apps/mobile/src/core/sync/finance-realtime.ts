import { supabase } from "@/core/supabase/client";
import { financeRealtimeTables, nextFinanceChannelName } from "@/core/sync/finance-realtime-policy";

export type FinanceRealtimeConnection = "connected" | "disconnected";

export function subscribeToFinanceChanges(input: {
  userId: string;
  onChange(): void;
  onConnectionChange?(connection: FinanceRealtimeConnection): void;
}) {
  const client = supabase;
  if (!client) return () => undefined;

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let active = true;
  const scheduleRefresh = () => {
    if (!active) return;
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { if (active) input.onChange(); }, 350);
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
      scheduleRefresh,
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
