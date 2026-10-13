export * from "./finance";
export * from "./billing";
export * from "./snapshot";

export interface ApiHealth {
  status: "ok";
  service: string;
  version: string;
}

export const MAX_MONEY = 9_000_000_000_000;

export function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}
