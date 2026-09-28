import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Picket — Quản lý tài chính thông minh",
  description: "Theo dõi chi tiêu, quét hóa đơn và lập kế hoạch tài chính.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
