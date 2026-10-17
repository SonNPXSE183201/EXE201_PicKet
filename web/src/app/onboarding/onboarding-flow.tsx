"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { completeOnboarding } from "./actions";

const personas = ["Đi làm", "Sinh viên", "Tự do", "Gia đình"] as const;
const goals = ["Hiểu chi tiêu", "Tiết kiệm", "Quản lý hóa đơn"] as const;
const currencies = ["VND", "USD"] as const;

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [persona, setPersona] = useState<(typeof personas)[number]>("Đi làm");
  const [goal, setGoal] = useState<(typeof goals)[number]>("Hiểu chi tiêu");
  const [currencyCode, setCurrencyCode] = useState<(typeof currencies)[number]>("VND");
  const [walletName, setWalletName] = useState("Tiền mặt");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function next() {
    setMessage(null);
    if (step === 1 && !displayName.trim()) return setMessage("Hãy nhập tên hiển thị.");
    if (step === 5 && !walletName.trim()) return setMessage("Hãy nhập tên ví.");
    if (step === 6 && !/^-?\d+$/.test(openingBalance)) return setMessage("Số dư chưa hợp lệ.");
    if (step === 7 && !accepted) return setMessage("Bạn cần xác nhận chính sách dữ liệu.");
    if (step < 7) return setStep((current) => current + 1);

    setBusy(true);
    try {
      await completeOnboarding({
        displayName,
        persona,
        goal,
        currencyCode,
        walletName,
        openingBalance: Number.parseInt(openingBalance, 10),
      });
    } catch {
      setMessage("Không hoàn tất được onboarding. Hãy kiểm tra Dart API và thử lại.");
      setBusy(false);
    }
  }

  return (
    <div className="onboarding-card">
      <div
        aria-label={`Tiến độ thiết lập: bước ${step + 1} trên 8`}
        aria-valuemax={8}
        aria-valuemin={1}
        aria-valuenow={step + 1}
        className="onboarding-progress"
        role="progressbar"
      >
        <span style={{ width: `${((step + 1) / 8) * 100}%` }} />
      </div>
      <p className="eyebrow">Thiết lập {step + 1}/8</p>

      {step === 0 && <Intro title="Giữ từng chi tiêu. Gom từng kỷ niệm." copy="Picket giúp bạn quét hóa đơn, hiểu dòng tiền và xây thói quen tài chính tốt hơn." />}
      {step === 1 && <Intro title="Mình gọi bạn là gì?" copy="Tên này chỉ dùng để cá nhân hóa trải nghiệm."><label className="sr-only" htmlFor="onboarding-display-name">Tên hiển thị</label><input className="onboarding-input" id="onboarding-display-name" onChange={(event) => setDisplayName(event.target.value)} placeholder="Tên hiển thị" value={displayName} /></Intro>}
      {step === 2 && <Intro title="Nhịp sống của bạn" copy="Chọn nhóm gần nhất với hoàn cảnh hiện tại."><Choices label="Nhịp sống" options={personas} selected={persona} select={setPersona} /></Intro>}
      {step === 3 && <Intro title="Mục tiêu chính" copy="Picket sẽ ưu tiên thông tin liên quan tới mục tiêu này."><Choices label="Mục tiêu chính" options={goals} selected={goal} select={setGoal} /></Intro>}
      {step === 4 && <Intro title="Đơn vị tiền tệ" copy="Bạn có thể thay đổi lựa chọn này sau."><Choices label="Đơn vị tiền tệ" options={currencies} selected={currencyCode} select={setCurrencyCode} /></Intro>}
      {step === 5 && <Intro title="Tạo ví đầu tiên" copy="Ví có thể là tiền mặt, tài khoản ngân hàng hoặc quỹ riêng."><label className="sr-only" htmlFor="onboarding-wallet-name">Tên ví</label><input className="onboarding-input" id="onboarding-wallet-name" onChange={(event) => setWalletName(event.target.value)} placeholder="Tên ví" value={walletName} /></Intro>}
      {step === 6 && <Intro title="Số dư hiện tại" copy="Nhập số dư để báo cáo bắt đầu đúng từ hôm nay."><label className="sr-only" htmlFor="onboarding-opening-balance">Số dư hiện tại</label><input className="onboarding-input" id="onboarding-opening-balance" inputMode="numeric" onChange={(event) => setOpeningBalance(event.target.value)} placeholder="Số dư" value={openingBalance} /></Intro>}
      {step === 7 && <Intro title="Sẵn sàng bắt đầu" copy={`${displayName}, bạn sẽ bắt đầu với ví “${walletName}”.`}><label className="consent-row"><input checked={accepted} onChange={(event) => setAccepted(event.target.checked)} type="checkbox" /><span>Tôi hiểu dữ liệu tài chính sẽ được lưu và đồng bộ an toàn theo cài đặt của mình.</span></label></Intro>}

      {message && <p className="form-message" role="alert">{message}</p>}
      <div className="onboarding-actions">
        {step > 0 && <button className="button secondary" disabled={busy} onClick={() => setStep((current) => current - 1)} type="button">Quay lại</button>}
        <button className="button primary" disabled={busy} onClick={next} type="button">{busy ? "Đang lưu..." : step === 7 ? "Bắt đầu cùng Picket" : "Tiếp tục"}</button>
      </div>
    </div>
  );
}

function Intro({ children, copy, title }: { children?: React.ReactNode; copy: string; title: string }) {
  return <section className="onboarding-step"><h1 className="auth-title">{title}</h1><p className="auth-copy">{copy}</p>{children && <div className="onboarding-body">{children}</div>}</section>;
}

function Choices<T extends string>({ label, options, selected, select }: { label: string; options: readonly T[]; selected: T; select: Dispatch<SetStateAction<T>> }) {
  return <div aria-label={label} className="choice-grid" role="group">{options.map((option) => <button aria-pressed={option === selected} className={option === selected ? "choice-button selected" : "choice-button"} key={option} onClick={() => select(option)} type="button">{option}</button>)}</div>;
}
