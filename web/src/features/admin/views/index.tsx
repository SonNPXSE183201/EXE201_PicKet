import type { ReactNode } from "react";
import type { AdminSection } from "../admin-permissions";
import type { ViewProps } from "./shared";
import { LegacyBody } from "./legacy";
import { OverviewView } from "./overview";
import { UsersView } from "./users";
import { AcquisitionView, EngagementView, OcrView } from "./growth";
import { BillingView, TicketsView } from "./customers";
import { HealthView, IncidentsView } from "./operations";
import { ContentView, PartnersView } from "./content";
import { AuditView, IntegrationsView, SettingsView, StaffView } from "./system";

/* Section → Paper view (Figma › Admin Web). Unlisted sections fall back to LegacyBody. */
const views: Partial<Record<AdminSection, (p: ViewProps) => ReactNode>> = {
  overview: (p) => <OverviewView {...p} />,
  users: (p) => <UsersView {...p} />,
  acquisition: (p) => <AcquisitionView {...p} />,
  engagement: (p) => <EngagementView {...p} />,
  ocr: (p) => <OcrView {...p} />,
  tickets: (p) => <TicketsView {...p} />,
  billing: (p) => <BillingView {...p} />,
  health: (p) => <HealthView {...p} />,
  incidents: (p) => <IncidentsView {...p} />,
  content: (p) => <ContentView {...p} />,
  partners: (p) => <PartnersView {...p} />,
  integrations: (p) => <IntegrationsView {...p} />,
  audit: (p) => <AuditView {...p} />,
  staff: (p) => <StaffView {...p} />,
  settings: (p) => <SettingsView {...p} />,
};

export function renderSection(props: ViewProps): ReactNode {
  return (views[props.section] ?? ((p: ViewProps) => <LegacyBody {...p} />))(props);
}
