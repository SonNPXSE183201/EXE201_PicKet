"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Icon } from "@/core/ui/workspace-icon";

const BalancePrivacyContext = createContext<{
  hidden: boolean;
  toggle: () => void;
} | null>(null);

export function BalancePrivacyProvider({
  initialHidden,
  children,
}: {
  initialHidden: boolean;
  children: ReactNode;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const value = {
    hidden,
    toggle: () => setHidden((value) => !value),
  };

  return (
    <BalancePrivacyContext.Provider value={value}>
      {children}
    </BalancePrivacyContext.Provider>
  );
}

export function BalanceVisibilityToggle() {
  const privacy = useBalancePrivacy();
  return (
    <button
      type="button"
      className="overview-balance-visibility"
      aria-label={privacy.hidden ? "Hiện số dư" : "Ẩn số dư"}
      aria-pressed={privacy.hidden}
      title={privacy.hidden ? "Hiện số dư" : "Ẩn số dư"}
      onClick={privacy.toggle}
    >
      <Icon name={privacy.hidden ? "eyeOff" : "eye"} />
    </button>
  );
}

export function BalanceAmount({ value }: { value: string }) {
  const { hidden } = useBalancePrivacy();
  return <>{hidden ? "••••••" : value}</>;
}

function useBalancePrivacy() {
  const value = useContext(BalancePrivacyContext);
  if (!value) {
    throw new Error("BalanceAmount must be inside BalancePrivacyProvider");
  }
  return value;
}
