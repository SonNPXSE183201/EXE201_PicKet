import { supabase } from "@/core/supabase/client";
import { financeRealtimeTables } from "@/core/sync/finance-realtime-policy";

export type FinanceRealtimeConnection = "connected" | "disconnected";

export function subscribeToFinanceChanges(input: {
  userId: string;
  onChange(): void;
  onConnectionChange?(connection: FinanceRealtimeConnection): void;
}) {
  const client = supabase;
  if (!client) return () => undefined;

  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleRefresh = () => {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(input.onChange, 350);
  };
  let channel = client.channel(`finance-sync-${input.userId}`);

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
    input.onConnectionChange?.(
      status === "SUBSCRIBED" ? "connected" : "disconnected",
    );
  });

  return () => {
    if (refreshTimer !== null) clearTimeout(refreshTimer);
    input.onConnectionChange?.("disconnected");
    void client.removeChannel(channel);
  };
}
