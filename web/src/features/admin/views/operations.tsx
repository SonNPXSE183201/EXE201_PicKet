import type { ViewProps } from "./shared";
import { LegacyBody } from "./legacy";

export function HealthView(p: ViewProps) {
  return <LegacyBody {...p} />;
}
export function IncidentsView(p: ViewProps) {
  return <LegacyBody {...p} />;
}
