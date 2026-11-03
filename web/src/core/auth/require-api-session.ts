import { PicketApiClient } from "@picket/api-client";
import { redirect } from "next/navigation";

import { createClient } from "@/core/supabase/server";
import { workspaceRedirect } from "./workspace-policy";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

function createMockApiClient(): PicketApiClient {
  return {
    async currentProfile() {
      return {
        profile: {
          id: "mock-user-123",
          displayName: "Nguyễn Sơn",
          locale: "vi-VN",
          timezone: "Asia/Ho_Chi_Minh",
          currencyCode: "VND",
          persona: "Đi làm",
          goal: "Hiểu chi tiêu",
          onboardingCompleted: true,
          hideBalance: false,
        },
      };
    },
    async listAccounts() {
      return {
        accounts: [
          { id: "acc-1", name: "Ví Tiền mặt", kind: "cash", currencyCode: "VND", openingBalance: 500000, archived: false, version: 1 },
          { id: "acc-2", name: "MB Bank", kind: "bank", currencyCode: "VND", openingBalance: 12000000, archived: false, version: 1 },
        ],
      };
    },
    async listTransactions() {
      const now = new Date();
      return {
        transactions: [
          { id: "tx-1", accountId: "acc-1", categoryId: "c2", kind: "expense", amount: 45000, title: "Cà phê sáng", occurredAt: new Date(now.getTime() - 2 * 3600000).toISOString(), version: 1 },
          { id: "tx-2", accountId: "acc-1", categoryId: "c3", kind: "expense", amount: 185000, title: "Siêu thị WinMart", occurredAt: new Date(now.getTime() - 8 * 3600000).toISOString(), version: 1 },
          { id: "tx-3", accountId: "acc-2", categoryId: "c1", kind: "income", amount: 18500000, title: "Lương tháng 10", occurredAt: new Date(now.getTime() - 24 * 3600000).toISOString(), version: 1 },
          { id: "tx-4", accountId: "acc-2", categoryId: "c4", kind: "expense", amount: 420000, title: "Mua sắm đồ dùng gia đình", occurredAt: new Date(now.getTime() - 48 * 3600000).toISOString(), version: 1 },
        ],
        totalCount: 4,
        hasMore: false,
      };
    },
    async listCategories() {
      return {
        categories: [
          { id: "c1", name: "Lương", kind: "income", color: "#793268", custom: false, version: 1 },
          { id: "c2", name: "Ăn uống & Cà phê", kind: "expense", color: "#BD3152", custom: false, version: 1 },
          { id: "c3", name: "Đi chợ & Thực phẩm", kind: "expense", color: "#1B7A5A", custom: false, version: 1 },
          { id: "c4", name: "Mua sắm", kind: "expense", color: "#6A5ACD", custom: false, version: 1 },
          { id: "c5", name: "Thưởng", kind: "income", color: "#FF9800", custom: false, version: 1 },
          { id: "c6", name: "Đầu tư", kind: "income", color: "#2196F3", custom: false, version: 1 },
          { id: "c7", name: "Quà tặng", kind: "both", color: "#E91E63", custom: false, version: 1 },
          { id: "c8", name: "Di chuyển", kind: "expense", color: "#009688", custom: false, version: 1 },
        ],
      };
    },
    async listBudgets() {
      return {
        budgets: [
          { id: "b1", categoryId: "c2", defaultLimit: 3000000, currencyCode: "VND", warningThreshold: 0.8, archived: false, version: 1 },
          { id: "b2", categoryId: "c3", defaultLimit: 4000000, currencyCode: "VND", warningThreshold: 0.85, archived: false, version: 1 },
        ],
      };
    },
    async getPlanning() {
      return { planning: { periods: [] }, periods: [], allocations: [] } as unknown as { periods: Array<{ budgetId: string; limit: number }>; allocations: unknown[] };
    },
    async listReceipts() {
      return { receipts: [] };
    },
    async currentEntitlements() {
      return { tier: "free", ocrFallbackRemaining: 5, ocrFallbackDailyLimit: 5, ocrFallbackUsed:0 };
    },
    async paymentCustomer() {return {catalog:[
      {sku:'picket_plus_monthly',tier:'plus',months:1,amount:19000},
      {sku:'picket_pro_monthly',tier:'pro',months:1,amount:39000},
      {sku:'picket_plus_yearly',tier:'plus',months:12,amount:199000},
      {sku:'picket_pro_yearly',tier:'pro',months:12,amount:499000},
    ],orders:[]};},
    async adminPayments() {return {total:0,series:[],orders:[],events:[]};},
    async adminPermissions() {return {catalog:[{code:'revenue.read',description:'Xem doanh thu'}],rules:[],groups:[]};},
    async listBills() {
      return { bills: [] };
    },
    async listSubscriptions() {
      return { subscriptions: [] };
    },
    async listKeepsakes() {
      return { keepsakes: [] };
    },
    async accountAccess() {
      return { staff: false, role: "user", mfaVerified: true };
    },
    async listSpendingSplits() {
      return { splits: [] };
    },
    async listTransactionSplitsByIds() {
      return { splits: [] };
    },
  } as unknown as PicketApiClient;
}

export async function requireApiSession(
  workspace: "user" | "admin" | "either" = "user",
) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_MOCK_AUTH === "1"
  ) {
    return {
      accessToken: "mock-token",
      api: createMockApiClient(),
      claims: { sub: "mock-user-123", email: "son.nguyen@picket.vn" },
      staff: workspace==='admin',
      role: workspace==='admin'?'owner':"user",
      mfaVerified: true, permissions: ['overview.read','revenue.read','payments.read','permissions.manage'],
    };
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) redirect("/login");

  const api = new PicketApiClient(apiBaseUrl);
  const access = await api.accountAccess(accessToken);
  const staff = access.staff;
  const destination =
    workspace === "either"
      ? null
      : workspaceRedirect(
          staff,
          workspace === "admin" ? "/admin" : "/dashboard",
        );
  if (destination) redirect(destination);

  return {
    accessToken,
    api,
    claims: claimsData.claims,
    staff,
    role: access.role,
    mfaVerified: access.mfaVerified, permissions: access.permissions,
  };
}
