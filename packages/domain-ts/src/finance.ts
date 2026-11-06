export type IsoDateTime = string;
export type CurrencyCode = string;
export type EntityId = string;

export interface VersionedEntity {
  id: EntityId;
  version: number;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  deletedAt: IsoDateTime | null;
}

export interface UserProfile extends VersionedEntity {
  displayName: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
}

export interface CurrentProfile {
  id: EntityId;
  displayName: string;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  locale: string;
  timezone: string;
  persona: string;
  goal: string;
  currencyCode: CurrencyCode;
  hideBalance: boolean;
  themeMode?: "system" | "light" | "dark" | null;
  languageMode?: string | null;
  colorSchemeId?: string | null;
}

export interface CurrentProfileResponse {
  profile: CurrentProfile | null;
}

export interface CompleteOnboardingRequest {
  displayName: string;
  persona: string;
  goal: string;
  currencyCode: CurrencyCode;
  walletName: string;
  openingBalance: number;
}

export interface CompleteOnboardingResult {
  walletId: EntityId;
}

export interface ProfilePatch {
  display_name?: string;
  avatar_url?: string;
  locale?: string;
  timezone?: string;
}

export interface PreferencesPatch {
  persona?: string;
  goal?: string;
  currency_code?: CurrencyCode;
  hide_balance?: boolean;
  theme_mode?: "system" | "light" | "dark";
  language_mode?: string;
  color_scheme_id?: string;
}

export interface UpdateResult {
  updated: true;
}

export interface DeleteAccountResult {
  deleted: true;
}

export type AccountKind = "cash" | "bank" | "ewallet" | "other";

export interface FinancialAccount extends VersionedEntity {
  name: string;
  kind: AccountKind;
  currencyCode: CurrencyCode;
  openingBalance: number;
  archived: boolean;
}

export interface AccountsResponse {
  accounts: FinancialAccount[];
}

export interface AccountResponse {
  account: FinancialAccount;
}

export interface CreateAccountRequest {
  name: string;
  kind: AccountKind;
  currencyCode: CurrencyCode;
  openingBalance: number;
}

export interface UpdateAccountRequest {
  expectedVersion: number;
  name?: string;
  kind?: AccountKind;
  currencyCode?: CurrencyCode;
}

export interface Category extends VersionedEntity {
  name: string;
  kind: "expense" | "income" | "both";
  color: string | null;
  icon: string | null;
  custom: boolean;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface CategoryResponse {
  category: Category;
}

export interface CreateCategoryRequest {
  name: string;
  kind: Category["kind"];
  color?: string | null;
  icon?: string | null;
}

export interface UpdateCategoryRequest {
  expectedVersion: number;
  name?: string;
  kind?: Category["kind"];
  color?: string | null;
  icon?: string | null;
}

export type TransactionKind = "expense" | "income" | "transfer" | "refund";

export interface Transaction extends VersionedEntity {
  title: string;
  amount: number;
  kind: TransactionKind;
  reconciledAccountIds?: EntityId[];
  accountId: EntityId;
  destinationAccountId: EntityId | null;
  categoryId: EntityId | null;
  occurredAt: IsoDateTime;
  note: string;
  refundOfTransactionId: EntityId | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
}

export interface TransactionResponse {
  transaction: Transaction;
}

export interface CreateTransactionRequest {
  title: string;
  amount: number;
  kind: "expense" | "income";
  accountId: EntityId;
  categoryId?: EntityId | null;
  occurredAt: IsoDateTime;
  note?: string;
}

export interface UpdateTransactionRequest {
  expectedVersion: number;
  title?: string;
  amount?: number;
  accountId?: EntityId;
  categoryId?: EntityId | null;
  occurredAt?: IsoDateTime;
  note?: string;
}

export interface CreateTransferRequest {
  sourceAccountId: EntityId;
  destinationAccountId: EntityId;
  title: string;
  amount: number;
  occurredAt: IsoDateTime;
  note?: string;
}

export interface CreateRefundRequest {
  amount: number;
  occurredAt: IsoDateTime;
  note?: string;
}

export interface TransactionSplit extends VersionedEntity {
  transactionId: EntityId;
  categoryId: EntityId;
  amount: number;
}

export interface TransactionSplitInput {
  categoryId: EntityId;
  amount: number;
}

export interface TransactionSplitsResponse {
  splits: TransactionSplit[];
}

export interface SetTransactionSplitsRequest {
  expectedVersion: number;
  splits: TransactionSplitInput[];
}

export interface SetTransactionSplitsResponse extends TransactionSplitsResponse {
  transaction: Transaction;
}

export interface Budget extends VersionedEntity {
  categoryId: EntityId;
  name: string;
  currencyCode?: CurrencyCode;
  defaultLimit: number;
  alertPercent: number;
  active: boolean;
}

export interface BudgetsResponse { budgets: Budget[]; }
export interface BudgetResponse { budget: Budget; }
export interface CreateBudgetRequest { categoryId: EntityId; name: string; defaultLimit: number; alertPercent: number; }
export interface UpdateBudgetRequest { expectedVersion: number; name?: string; defaultLimit?: number; alertPercent?: number; active?: boolean; }

export type BillStatus = "pending" | "paid" | "overdue" | "cancelled";

export interface Bill extends VersionedEntity {
  paidTransactionId: EntityId | null;
  title: string;
  amount: number;
  dueAt: IsoDateTime;
  status: BillStatus;
}

export interface BillsResponse { bills: Bill[]; }
export interface BillResponse { bill: Bill; }
export interface CreateBillRequest { title: string; amount: number; dueAt: IsoDateTime; }
export interface UpdateBillRequest {
  expectedVersion: number;
  title?: string;
  amount?: number;
  dueAt?: IsoDateTime;
  status?: BillStatus;
  paidTransactionId?: EntityId | null;
}

export type SubscriptionCadence = "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export interface FinanceSubscription extends VersionedEntity { walletId: EntityId | null; categoryId: EntityId | null; title: string; amount: number; cadence: SubscriptionCadence; nextDueAt: IsoDateTime; cycleMonths: number; active: boolean; note: string; alertDays: number; }
export interface SubscriptionsResponse { subscriptions: FinanceSubscription[]; }
export interface SubscriptionResponse { subscription: FinanceSubscription; }
export interface CreateSubscriptionRequest { walletId?: EntityId | null; categoryId?: EntityId | null; title: string; amount: number; cadence: SubscriptionCadence; nextDueAt: IsoDateTime; cycleMonths: number; note: string; alertDays: number; }
export interface UpdateSubscriptionRequest { expectedVersion: number; walletId?: EntityId | null; categoryId?: EntityId | null; title?: string; amount?: number; cadence?: SubscriptionCadence; nextDueAt?: IsoDateTime; cycleMonths?: number; active?: boolean; note?: string; alertDays?: number; }

export interface BudgetPeriod extends VersionedEntity {
  budgetId: EntityId;
  month: string;
  limit: number;
}
export type BudgetMethod = "simple" | "envelope" | "zero_based" | "fifty_thirty_twenty" | "event";
export interface PlanningPeriod { budgetId: EntityId; month: string; limit: number; carriedAmount: number; }
export interface PlanningMonthClose { month: string; closedAt: IsoDateTime; income: number; expense: number; note: string; rollover: boolean; }
export interface PlanningResponse { method: BudgetMethod; periods: PlanningPeriod[]; close: PlanningMonthClose | null; }
export interface TransferBudgetLimitRequest { sourceBudgetId: EntityId; destinationBudgetId: EntityId; month: string; amount: number; }
export interface CloseBudgetMonthRequest { month: string; rollover: boolean; note: string; }
export interface PlanningActionResponse { month: string; sourceLimit?: number; destinationLimit?: number; income?: number; expense?: number; rollover?: boolean; }
export interface ReconcileWalletRequest {
  requestId: EntityId;
  accountId: EntityId;
  statementDate: string;
  statementBalance: number;
  selectedTransactionIds: EntityId[];
  reason: string;
}
export interface ReconcileWalletResponse { id: EntityId; difference: number; adjustmentTransactionId: EntityId | null; replayed: boolean; }

export interface Keepsake extends VersionedEntity {
  title: string;
  amount: number;
  purchasedAt: IsoDateTime;
  note: string;
  category: string;
  warrantyUntil: string | null;
  returnUntil: string | null;
  mediaPath: string | null;
}
export interface KeepsakesResponse { keepsakes: Keepsake[]; }
export interface KeepsakeResponse { keepsake: Keepsake; }
export interface CreateKeepsakeRequest {
  id: EntityId;
  title: string;
  amount: number;
  purchasedAt: IsoDateTime;
  note: string;
  category: string;
  warrantyUntil?: string | null;
  returnUntil?: string | null;
  mediaPath?: string | null;
}
export type UpdateKeepsakeRequest = Partial<Omit<CreateKeepsakeRequest, "id">> & { expectedVersion: number };

export type ReceiptStatus =
  | "captured"
  | "processing"
  | "review_required"
  | "confirmed"
  | "failed";

export interface Receipt extends VersionedEntity {
  transactionId: EntityId | null;
  merchantName: string | null;
  purchasedAt: IsoDateTime | null;
  total: number | null;
  currencyCode: CurrencyCode;
  status: ReceiptStatus;
  confidence: number | null;
  mediaAssetId: EntityId | null;
}

export interface ReceiptLineItem extends VersionedEntity {
  receiptId: EntityId;
  name: string;
  quantity: number;
  unitPrice: number | null;
  total: number;
  confidence: number | null;
}

export interface ReceiptRecord extends VersionedEntity {
  transactionId: EntityId | null;
  storagePath: string;
  merchant: string | null;
  detectedTotal: number | null;
  purchasedAt: IsoDateTime | null;
  currencyCode: CurrencyCode;
  confidence: number | null;
  ocrProvider: "ml-kit" | "pp-ocr" | "manual";
  reviewRequired: boolean;
  rawText: string | null;
  imageSha256: string | null;
  status: "processing" | "review_required" | "confirmed" | "failed";
  lineItems: ReceiptLineItem[];
}

export interface ReceiptRecordsResponse {
  receipts: ReceiptRecord[];
}

export interface ReceiptRecordResponse {
  receipt: ReceiptRecord;
}

export interface ReceiptLineItemInput {
  name: string;
  quantity: number;
  unitPrice?: number | null;
  total: number;
  confidence?: number | null;
}

export interface CreateReceiptRecordRequest {
  transactionId?: EntityId | null;
  storagePath: string;
  merchant?: string | null;
  detectedTotal?: number | null;
  purchasedAt?: IsoDateTime | null;
  currencyCode: CurrencyCode;
  confidence?: number | null;
  ocrProvider: ReceiptRecord["ocrProvider"];
  reviewRequired: boolean;
  rawText?: string | null;
  imageSha256?: string | null;
  lineItems?: ReceiptLineItemInput[];
}

export interface UpdateReceiptRecordRequest {
  expectedVersion: number;
  merchant: string | null;
  detectedTotal: number | null;
  purchasedAt: IsoDateTime | null;
  reviewRequired: boolean;
  lineItems: ReceiptLineItemInput[];
}

export interface FindDuplicateReceiptRequest {
  imageSha256?: string | null;
  merchant?: string | null;
  purchasedAt?: IsoDateTime | null;
  total?: number | null;
}

export interface DuplicateReceiptMatch {
  id: EntityId;
  matchType: "exact_hash" | "merchant_date_total";
}

export interface DuplicateReceiptsResponse {
  duplicates: DuplicateReceiptMatch[];
}

export type OcrFallbackJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface OcrFallbackJob {
  id: EntityId;
  storagePath: string;
  localConfidence: number;
  status: OcrFallbackJobStatus;
  result: Record<string, unknown> | null;
  errorCode: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  expiresAt: IsoDateTime;
  startedAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
}

export interface OcrFallbackJobsResponse {
  jobs: OcrFallbackJob[];
}

export interface OcrFallbackJobResponse {
  job: OcrFallbackJob;
}

export interface CreateOcrFallbackJobRequest {
  storagePath: string;
  localConfidence: number;
  idempotencyKey: string;
}

export interface EntityConflict<T> {
  local: T;
  remote: T;
  expectedVersion: number;
  actualVersion: number;
}
