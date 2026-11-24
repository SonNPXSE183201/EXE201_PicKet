"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/core/ui/workspace-icon";

export function ForecastError() {
  const router = useRouter();
  return <div className="fc-error" role="alert"><span className="fc-error-icon"><Icon name="alert" /></span><h2>Không tải được dự báo</h2><p className="fc-muted">Chưa tính được dự báo. Hãy kiểm tra kết nối và dữ liệu ví rồi thử lại. Ghi chép của bạn vẫn an toàn trên máy.</p><button type="button" className="button primary" aria-label="Thử lại dự báo" onClick={() => router.refresh()}>Thử lại</button><Link className="fc-link" href="/dashboard">Quay lại</Link></div>;
}
