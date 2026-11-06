"use client";

import Image from "next/image";
import { useState } from "react";

const LIMIT = 6_000_000;

export function LandingSimulator() {
  const [spent, setSpent] = useState(4_250_000);
  const percent = Math.min(100, Math.round((spent / LIMIT) * 100));
  const overLimit = percent > 85;
  const money = (value: number) => `${value.toLocaleString("vi-VN")} ₫`;

  return (
    <section className="legacy-simulator-section" id="simulator">
      <div className="legacy-section-heading">
        <span className="legacy-kicker">THỬ MỘT CHÚT</span>
        <h2>Thử xem ngân sách chuyển động</h2>
        <p>
          Chọn một khoản bên dưới để xem số tiền đã chi và hạn mức thay đổi.
        </p>
      </div>
      <div className="legacy-simulator">
        <div className="legacy-simulator-controls">
          <p className="legacy-control-label">Thêm giao dịch minh họa</p>
          <button
            className="legacy-simulator-button"
            onClick={() => setSpent((value) => value + 45_000)}
            type="button"
          >
            <span className="legacy-sim-label">
              <Image src="/paper/category-cafe-v1.png" alt="" width={36} height={36} />
              Cà phê sáng Highlands
            </span>
            <strong className="legacy-expense">−45.000 ₫</strong>
          </button>
          <button
            className="legacy-simulator-button"
            onClick={() => setSpent((value) => value + 280_000)}
            type="button"
          >
            <span className="legacy-sim-label">
              <Image src="/paper/category-groceries-v1.png" alt="" width={36} height={36} />
              Đi chợ thực phẩm
            </span>
            <strong className="legacy-expense">−280.000 ₫</strong>
          </button>
          <button
            className="legacy-simulator-button"
            onClick={() => setSpent((value) => Math.max(500_000, value - 1_500_000))}
            type="button"
          >
            <span className="legacy-sim-label">
              <Image src="/paper/category-salary-v1.png" alt="" width={36} height={36} />
              Nhận lương chuyển khoản
            </span>
            <strong className="legacy-income">+1.500.000 ₫</strong>
          </button>
        </div>

        <div className="legacy-simulator-display" aria-live="polite">
          <div className="legacy-sim-heading">
            <strong>Phong bì Ăn uống &amp; Tiêu dùng</strong>
            <span className={overLimit ? "legacy-status-pill is-warning" : "legacy-status-pill"}>
              {overLimit ? `Sắp chạm hạn mức · ${percent}%` : `Trong hạn mức · ${percent}%`}
            </span>
          </div>
          <div>
            <div className="legacy-sim-values">
              <span>Đã chi: <strong className="legacy-expense">{money(spent)}</strong></span>
              <span>Hạn mức: {money(LIMIT)}</span>
            </div>
            <div
              className="legacy-meter"
              role="progressbar"
              aria-label="Mức ngân sách đã sử dụng"
              aria-valuemin={0}
              aria-valuemax={LIMIT}
              aria-valuenow={Math.min(spent, LIMIT)}
            >
              <span style={{ width: `${percent}%` }} />
            </div>
          </div>
          <div className="legacy-sim-note">
            <Image src="/paper/state-empty-wallet-v1.png" alt="" width={48} height={48} />
            <p>
              <strong>Dòng tiền được theo dõi rõ ràng</strong>
              <span>Xem lại ngân sách và khoản chi ngay khi cần.</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
