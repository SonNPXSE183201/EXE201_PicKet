import type { ViewProps } from "./shared";
import { LegacyBody } from "./legacy";

export function TicketsView(p: ViewProps) {
  return <LegacyBody {...p} />;
}
export function BillingView(p: ViewProps) {
  return <LegacyBody {...p} />;
}
