import type { ReactNode } from "react";
import { Icon } from "./workspace-icon";
import "./notice.css";

export function Notice({ tone = "info", title, body, action }: { tone?: "success" | "warning" | "info"; title?: string; body: ReactNode; action?: ReactNode }) {
  return <div className={`paper-notice is-${tone}`} role={tone === "success" ? "status" : undefined}><span className="paper-notice-icon"><Icon name={tone === "success" ? "check" : tone === "warning" ? "alert" : "sparkle"} /></span><div>{title && <strong>{title}</strong>}<p>{body}</p>{action}</div></div>;
}
