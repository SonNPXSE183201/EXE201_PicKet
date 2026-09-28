"use client";

import { PicketApiClient } from "@picket/api-client";
import { useEffect, useMemo, useState } from "react";

type ApiState = "checking" | "online" | "offline";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function Home() {
  const [apiState, setApiState] = useState<ApiState>("checking");
  const client = useMemo(
    () =>
      new PicketApiClient(apiBaseUrl),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    client
      .health(controller.signal)
      .then(() => setApiState("online"))
      .catch((error: unknown) => {
        if (!(error instanceof Error && error.name === "AbortError")) {
          setApiState("offline");
        }
      });
    return () => controller.abort();
  }, [client]);

  const statusText = {
    checking: "Đang kiểm tra API",
    online: "Dart API đang hoạt động",
    offline: "Dart API chưa được khởi động",
  }[apiState];

  return (
    <main>
      <nav className="nav shell" aria-label="Điều hướng chính">
        <a className="brand" href="#top" aria-label="Picket trang chủ">
          <span className="brand-mark">P</span>
          <span>Picket</span>
        </a>
        <span className={`api-status ${apiState}`}>
          <span className="status-dot" aria-hidden="true" />
          {statusText}
        </span>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Tài chính rõ ràng, mỗi ngày</p>
          <h1>Biến từng hóa đơn thành một quyết định tốt hơn.</h1>
          <p className="lead">
            Picket gom mọi khoản thu chi vào một nơi. Quét hóa đơn nhanh trên
            thiết bị, đồng bộ an toàn và theo dõi kế hoạch trên web hoặc mobile.
          </p>
          <div className="actions">
            <a className="button primary" href="#architecture">
              Khám phá nền tảng
            </a>
            <a className="button secondary" href={`${apiBaseUrl}/openapi.yaml`}>
              Xem API contract
            </a>
          </div>
        </div>

        <div className="overview-card" aria-label="Bản xem trước tổng quan">
          <div className="card-heading">
            <div>
              <span>Số dư tháng này</span>
              <strong>18.420.000 ₫</strong>
            </div>
            <span className="trend">+8,4%</span>
          </div>
          <div className="chart" aria-hidden="true">
            {[38, 52, 47, 68, 60, 82, 74, 92].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="summary-row">
            <div>
              <span>Thu nhập</span>
              <strong className="income">24.800.000 ₫</strong>
            </div>
            <div>
              <span>Chi tiêu</span>
              <strong className="expense">6.380.000 ₫</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="features shell" id="architecture">
        <article>
          <span className="feature-number">01</span>
          <h2>OCR ưu tiên thiết bị</h2>
          <p>
            ML Kit xử lý nhanh, hoạt động ngoại tuyến. Ảnh khó mới chuyển sang
            fallback để giữ trải nghiệm mượt trên Android cấu hình yếu.
          </p>
        </article>
        <article>
          <span className="feature-number">02</span>
          <h2>Một hợp đồng API</h2>
          <p>
            Next.js và Expo dùng chung client TypeScript, giao tiếp với Dart Frog
            qua REST/OpenAPI thay vì phụ thuộc trực tiếp vào dữ liệu nội bộ.
          </p>
        </article>
        <article>
          <span className="feature-number">03</span>
          <h2>Đồng bộ có kiểm soát</h2>
          <p>
            Supabase tiếp tục đảm nhiệm xác thực và Postgres. JWT người dùng được
            chuyển tiếp để mọi chính sách RLS vẫn được bảo toàn.
          </p>
        </article>
      </section>
    </main>
  );
}
