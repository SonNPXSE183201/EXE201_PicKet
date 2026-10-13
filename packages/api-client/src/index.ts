import type {
  ApiHealth,
  AdminOverview,
  AdminUserActionRequest,
  AdminUserActionResult,
  AccountResponse,
  AccountsResponse,
  BudgetResponse,
  BudgetsResponse,
  CategoriesResponse,
  CategoryResponse,
  CompleteOnboardingRequest,
  CompleteOnboardingResult,
  CreateAccountRequest,
  CreateBudgetRequest,
  CreateCategoryRequest,
  CreateRefundRequest,
  CreateReceiptRecordRequest,
  CreateTransactionRequest,
  CreateTransferRequest,
  CreateOcrFallbackJobRequest,
  CurrentProfileResponse,
  DeleteAccountResult,
  FinanceSnapshotEnvelope,
  FinanceExportEnvelope,
  FinanceImportSummary,
  Entitlements,
  FindDuplicateReceiptRequest,
  OcrFallbackJobResponse,
  OcrFallbackJobsResponse,
  ReceiptRecordResponse,
  ReceiptRecordsResponse,
  RestoreFinanceRequest,
  RestoreFinanceResult,
  DuplicateReceiptsResponse,
  PreferencesPatch,
  ProfilePatch,
  SaveFinanceSnapshotRequest,
  SaveFinanceSnapshotResult,
  SetTransactionSplitsRequest,
  SetTransactionSplitsResponse,
  TransactionResponse,
  TransactionSplitsResponse,
  TransactionsResponse,
  UpdateResult,
  UpdateAccountRequest,
  UpdateBudgetRequest,
  UpdateCategoryRequest,
  UpdateReceiptRecordRequest,
  UpdateTransactionRequest,
} from "@picket/domain";

export interface PicketApiClientOptions {
  fetch?: typeof globalThis.fetch;
  requestTimeoutMs?: number;
}

type PicketRequestInit = RequestInit & { timeoutMs?: number };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class PicketApiClient {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(baseUrl: string, options: PicketApiClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.requestTimeoutMs = options.requestTimeoutMs ?? 12_000;
    if (!Number.isSafeInteger(this.requestTimeoutMs) || this.requestTimeoutMs < 1) {
      throw new ApiError("Invalid request timeout", 400);
    }
  }

  health(signal?: AbortSignal): Promise<ApiHealth> {
    return this.request<ApiHealth>("/health", { signal });
  }

  currentEntitlements(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<Entitlements> {
    return this.request<Entitlements>("/v1/entitlements", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  adminOverview(
    accessToken: string,
    page = 0,
    signal?: AbortSignal,
  ): Promise<AdminOverview> {
    if (!Number.isSafeInteger(page) || page < 0 || page > 100_000) {
      throw new ApiError("Invalid admin page", 400);
    }
    return this.request<AdminOverview>(`/v1/admin/overview?page=${page}`, {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  adminUserAction(
    accessToken: string,
    targetUser: string,
    request: AdminUserActionRequest,
    signal?: AbortSignal,
  ): Promise<AdminUserActionResult> {
    return this.request<AdminUserActionResult>(
      `/v1/admin/users/${encodeURIComponent(targetUser)}/actions`,
      {
        method: "POST",
        headers: this.jsonAuthHeaders(accessToken),
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  currentProfile(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<CurrentProfileResponse> {
    return this.request<CurrentProfileResponse>("/v1/me", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  exportFinance(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<FinanceExportEnvelope> {
    return this.request<FinanceExportEnvelope>("/v1/export", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  deleteAccount(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<DeleteAccountResult> {
    return this.request<DeleteAccountResult>("/v1/account", {
      method: "DELETE",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify({ confirmation: "DELETE" }),
      signal,
      timeoutMs: 35_000,
    });
  }

  validateFinanceImport(
    accessToken: string,
    exported: FinanceExportEnvelope,
    signal?: AbortSignal,
  ): Promise<FinanceImportSummary> {
    return this.request<FinanceImportSummary>("/v1/import", {
      method: "POST",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(exported),
      signal,
    });
  }

  restoreFinance(
    accessToken: string,
    request: RestoreFinanceRequest,
    signal?: AbortSignal,
  ): Promise<RestoreFinanceResult> {
    return this.request<RestoreFinanceResult>("/v1/import", {
      method: "PUT",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(request),
      signal,
      timeoutMs: 35_000,
    });
  }

  completeOnboarding(
    accessToken: string,
    request: CompleteOnboardingRequest,
    signal?: AbortSignal,
  ): Promise<CompleteOnboardingResult> {
    return this.request<CompleteOnboardingResult>("/v1/onboarding", {
      method: "POST",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(request),
      signal,
    });
  }

  updateProfile(
    accessToken: string,
    patch: ProfilePatch,
    signal?: AbortSignal,
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>("/v1/profile", {
      method: "PATCH",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(patch),
      signal,
    });
  }

  updatePreferences(
    accessToken: string,
    patch: PreferencesPatch,
    signal?: AbortSignal,
  ): Promise<UpdateResult> {
    return this.request<UpdateResult>("/v1/preferences", {
      method: "PATCH",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(patch),
      signal,
    });
  }

  listAccounts(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<AccountsResponse> {
    return this.request<AccountsResponse>("/v1/accounts", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  createAccount(
    accessToken: string,
    request: CreateAccountRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<AccountResponse> {
    if (!idempotencyKey.trim()) throw new ApiError("Missing idempotency key", 400);
    return this.request<AccountResponse>("/v1/accounts", {
      method: "POST",
      headers: { ...this.jsonAuthHeaders(accessToken), "idempotency-key": idempotencyKey },
      body: JSON.stringify(request),
      signal,
    });
  }

  updateAccount(
    accessToken: string,
    accountId: string,
    request: UpdateAccountRequest,
    signal?: AbortSignal,
  ): Promise<AccountResponse> {
    return this.request<AccountResponse>(
      `/v1/accounts/${encodeURIComponent(accountId)}`,
      {
        method: "PATCH",
        headers: this.jsonAuthHeaders(accessToken),
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  archiveAccount(
    accessToken: string,
    accountId: string,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<AccountResponse> {
    const query = new URLSearchParams({
      expectedVersion: String(expectedVersion),
    });
    return this.request<AccountResponse>(
      `/v1/accounts/${encodeURIComponent(accountId)}?${query}`,
      {
        method: "DELETE",
        headers: this.authHeaders(accessToken),
        signal,
      },
    );
  }

  listBudgets(accessToken: string, signal?: AbortSignal): Promise<BudgetsResponse> {
    return this.request<BudgetsResponse>("/v1/budgets", { headers: this.authHeaders(accessToken), signal });
  }

  createBudget(accessToken: string, request: CreateBudgetRequest, idempotencyKey: string, signal?: AbortSignal): Promise<BudgetResponse> {
    if (!idempotencyKey.trim()) throw new ApiError("Missing idempotency key", 400);
    return this.request<BudgetResponse>("/v1/budgets", { method: "POST", headers: { ...this.jsonAuthHeaders(accessToken), "idempotency-key": idempotencyKey }, body: JSON.stringify(request), signal });
  }

  updateBudget(accessToken: string, id: string, request: UpdateBudgetRequest, signal?: AbortSignal): Promise<BudgetResponse> {
    return this.request<BudgetResponse>(`/v1/budgets/${encodeURIComponent(id)}`, { method: "PATCH", headers: this.jsonAuthHeaders(accessToken), body: JSON.stringify(request), signal });
  }

  archiveBudget(accessToken: string, id: string, expectedVersion: number, signal?: AbortSignal): Promise<BudgetResponse> {
    return this.request<BudgetResponse>(`/v1/budgets/${encodeURIComponent(id)}?${new URLSearchParams({ expectedVersion: String(expectedVersion) })}`, { method: "DELETE", headers: this.authHeaders(accessToken), signal });
  }

  listCategories(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<CategoriesResponse> {
    return this.request<CategoriesResponse>("/v1/categories", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  createCategory(
    accessToken: string,
    request: CreateCategoryRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<CategoryResponse> {
    if (!idempotencyKey.trim()) throw new ApiError("Missing idempotency key", 400);
    return this.request<CategoryResponse>("/v1/categories", {
      method: "POST",
      headers: { ...this.jsonAuthHeaders(accessToken), "idempotency-key": idempotencyKey },
      body: JSON.stringify(request),
      signal,
    });
  }

  updateCategory(
    accessToken: string,
    categoryId: string,
    request: UpdateCategoryRequest,
    signal?: AbortSignal,
  ): Promise<CategoryResponse> {
    return this.request<CategoryResponse>(
      `/v1/categories/${encodeURIComponent(categoryId)}`,
      {
        method: "PATCH",
        headers: this.jsonAuthHeaders(accessToken),
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  archiveCategory(
    accessToken: string,
    categoryId: string,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<CategoryResponse> {
    const query = new URLSearchParams({
      expectedVersion: String(expectedVersion),
    });
    return this.request<CategoryResponse>(
      `/v1/categories/${encodeURIComponent(categoryId)}?${query}`,
      {
        method: "DELETE",
        headers: this.authHeaders(accessToken),
        signal,
      },
    );
  }

  listTransactions(
    accessToken: string,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<TransactionsResponse> {
    const query = new URLSearchParams();
    if (options.limit !== undefined) {
      query.set("limit", String(options.limit));
    }
    const suffix = query.size > 0 ? `?${query}` : "";
    return this.request<TransactionsResponse>(`/v1/transactions${suffix}`, {
      headers: this.authHeaders(accessToken),
      signal: options.signal,
    });
  }

  createTransaction(
    accessToken: string,
    request: CreateTransactionRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<TransactionResponse> {
    if (!idempotencyKey.trim()) {
      throw new ApiError("Missing idempotency key", 400);
    }
    return this.request<TransactionResponse>("/v1/transactions", {
      method: "POST",
      headers: {
        ...this.jsonAuthHeaders(accessToken),
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(request),
      signal,
    });
  }

  updateTransaction(
    accessToken: string,
    transactionId: string,
    request: UpdateTransactionRequest,
    signal?: AbortSignal,
  ): Promise<TransactionResponse> {
    return this.request<TransactionResponse>(
      `/v1/transactions/${encodeURIComponent(transactionId)}`,
      {
        method: "PATCH",
        headers: this.jsonAuthHeaders(accessToken),
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  archiveTransaction(
    accessToken: string,
    transactionId: string,
    expectedVersion: number,
    signal?: AbortSignal,
  ): Promise<TransactionResponse> {
    const query = new URLSearchParams({
      expectedVersion: String(expectedVersion),
    });
    return this.request<TransactionResponse>(
      `/v1/transactions/${encodeURIComponent(transactionId)}?${query}`,
      {
        method: "DELETE",
        headers: this.authHeaders(accessToken),
        signal,
      },
    );
  }

  createTransfer(
    accessToken: string,
    request: CreateTransferRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<TransactionResponse> {
    if (!idempotencyKey.trim()) {
      throw new ApiError("Missing idempotency key", 400);
    }
    return this.request<TransactionResponse>("/v1/transfers", {
      method: "POST",
      headers: {
        ...this.jsonAuthHeaders(accessToken),
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify(request),
      signal,
    });
  }

  createRefund(
    accessToken: string,
    transactionId: string,
    request: CreateRefundRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<TransactionResponse> {
    if (!idempotencyKey.trim()) {
      throw new ApiError("Missing idempotency key", 400);
    }
    return this.request<TransactionResponse>(
      `/v1/transactions/${encodeURIComponent(transactionId)}/refunds`,
      {
        method: "POST",
        headers: {
          ...this.jsonAuthHeaders(accessToken),
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  listTransactionSplits(
    accessToken: string,
    transactionId: string,
    signal?: AbortSignal,
  ): Promise<TransactionSplitsResponse> {
    return this.request<TransactionSplitsResponse>(
      `/v1/transactions/${encodeURIComponent(transactionId)}/splits`,
      { headers: this.authHeaders(accessToken), signal },
    );
  }

  setTransactionSplits(
    accessToken: string,
    transactionId: string,
    request: SetTransactionSplitsRequest,
    signal?: AbortSignal,
  ): Promise<SetTransactionSplitsResponse> {
    return this.request<SetTransactionSplitsResponse>(
      `/v1/transactions/${encodeURIComponent(transactionId)}/splits`,
      {
        method: "PUT",
        headers: this.jsonAuthHeaders(accessToken),
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  listOcrFallbackJobs(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<OcrFallbackJobsResponse> {
    return this.request<OcrFallbackJobsResponse>("/v1/ocr/jobs", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  getOcrFallbackJob(
    accessToken: string,
    jobId: string,
    signal?: AbortSignal,
  ): Promise<OcrFallbackJobResponse> {
    return this.request<OcrFallbackJobResponse>(
      `/v1/ocr/jobs/${encodeURIComponent(jobId)}`,
      { headers: this.authHeaders(accessToken), signal },
    );
  }

  createOcrFallbackJob(
    accessToken: string,
    request: CreateOcrFallbackJobRequest,
    signal?: AbortSignal,
  ): Promise<OcrFallbackJobResponse> {
    return this.request<OcrFallbackJobResponse>("/v1/ocr/jobs", {
      method: "POST",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(request),
      signal,
    });
  }

  listReceipts(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<ReceiptRecordsResponse> {
    return this.request<ReceiptRecordsResponse>("/v1/receipts", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  getReceipt(
    accessToken: string,
    receiptId: string,
    signal?: AbortSignal,
  ): Promise<ReceiptRecordResponse> {
    return this.request<ReceiptRecordResponse>(
      `/v1/receipts/${encodeURIComponent(receiptId)}`,
      { headers: this.authHeaders(accessToken), signal },
    );
  }

  createReceipt(
    accessToken: string,
    request: CreateReceiptRecordRequest,
    signal?: AbortSignal,
  ): Promise<ReceiptRecordResponse> {
    return this.request<ReceiptRecordResponse>("/v1/receipts", {
      method: "POST",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(request),
      signal,
    });
  }

  updateReceipt(
    accessToken: string,
    receiptId: string,
    request: UpdateReceiptRecordRequest,
    signal?: AbortSignal,
  ): Promise<ReceiptRecordResponse> {
    return this.request<ReceiptRecordResponse>(
      `/v1/receipts/${encodeURIComponent(receiptId)}`,
      {
        method: "PUT",
        headers: this.jsonAuthHeaders(accessToken),
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  findDuplicateReceipts(
    accessToken: string,
    request: FindDuplicateReceiptRequest,
    signal?: AbortSignal,
  ): Promise<DuplicateReceiptsResponse> {
    return this.request<DuplicateReceiptsResponse>(
      "/v1/receipts/duplicates",
      {
        method: "POST",
        headers: this.jsonAuthHeaders(accessToken),
        body: JSON.stringify(request),
        signal,
      },
    );
  }

  loadFinanceSnapshot(
    accessToken: string,
    signal?: AbortSignal,
  ): Promise<FinanceSnapshotEnvelope> {
    return this.request<FinanceSnapshotEnvelope>("/v1/finance/snapshot", {
      headers: this.authHeaders(accessToken),
      signal,
    });
  }

  saveFinanceSnapshot(
    accessToken: string,
    request: SaveFinanceSnapshotRequest,
    signal?: AbortSignal,
  ): Promise<SaveFinanceSnapshotResult> {
    return this.request<SaveFinanceSnapshotResult>("/v1/finance/snapshot", {
      method: "PUT",
      headers: this.jsonAuthHeaders(accessToken),
      body: JSON.stringify(request),
      signal,
    });
  }

  private authHeaders(accessToken: string): HeadersInit {
    if (!accessToken.trim()) throw new ApiError("Missing access token", 401);
    return { authorization: `Bearer ${accessToken}` };
  }

  private jsonAuthHeaders(accessToken: string): HeadersInit {
    return {
      ...this.authHeaders(accessToken),
      "content-type": "application/json",
    };
  }

  private async request<T>(path: string, init: PicketRequestInit = {}): Promise<T> {
    const { timeoutMs = this.requestTimeoutMs, ...fetchInit } = init;
    const controller = new AbortController();
    const externalSignal = fetchInit.signal;
    let timedOut = false;
    const abortFromCaller = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}${path}`, {
        ...fetchInit,
        signal: controller.signal,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        !timedOut
      ) {
        throw error;
      }
      throw new ApiError("Không thể kết nối đến Picket API", 0, error);
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body
          ? String(body.error)
          : `Picket API trả về lỗi ${response.status}`;
      throw new ApiError(message, response.status, body);
    }

    return body as T;
  }
}
