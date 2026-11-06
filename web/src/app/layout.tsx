import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";
import "./compact.css";

export const metadata: Metadata = {
  title: "Picket — Quản lý tài chính thông minh",
  description: "Theo dõi chi tiêu, quét hóa đơn và lập kế hoạch tài chính.",
  icons: {
    icon: "/picket-logo.png?v=picket-2",
    shortcut: "/picket-logo.png?v=picket-2",
    apple: "/picket-logo.png?v=picket-2",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
