import type { ViewProps } from "./shared";
import { LegacyBody } from "./legacy";

export function ContentView(p: ViewProps) {
  return <LegacyBody {...p} />;
}
export function PartnersView(p: ViewProps) {
  return <LegacyBody {...p} />;
}
