import type { Metadata } from "next";
import "./globals.css";
import './workspace.css';

export const metadata: Metadata = {
  title: "Picket — Quản lý tài chính thông minh",
  description: "Theo dõi chi tiêu, quét hóa đơn và lập kế hoạch tài chính.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
