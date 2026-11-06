import type {
  AccountResponse,
  AccountsResponse,
  AdminOverview,
  AdminUserActionResult,
  CategoriesResponse,
  CategoryResponse,
  DeleteAccountResult,
  FinanceSnapshotEnvelope,
  FinanceExportEnvelope,
  FinanceImportSummary,
  OcrFallbackJobResponse,
  ReceiptRecordResponse,
  RestoreFinanceResult,
  SaveFinanceSnapshotResult,
  SetTransactionSplitsResponse,
  TransactionResponse,
  TransactionsResponse,
} from "@picket/domain";

import type { PicketApiClient } from "../src/index";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;

type Assert<Value extends true> = Value;

type LoadResult = Awaited<ReturnType<PicketApiClient["loadFinanceSnapshot"]>>;
type AdminOverviewResult = Awaited<ReturnType<PicketApiClient["adminOverview"]>>;
type AdminActionResult = Awaited<ReturnType<PicketApiClient["adminUserAction"]>>;
type SaveResult = Awaited<ReturnType<PicketApiClient["saveFinanceSnapshot"]>>;
type ExportResult = Awaited<ReturnType<PicketApiClient["exportFinance"]>>;
type DeleteAccountMutationResult = Awaited<
  ReturnType<PicketApiClient["deleteAccount"]>
>;
type ImportValidationResult = Awaited<
  ReturnType<PicketApiClient["validateFinanceImport"]>
>;
type RestoreMutationResult = Awaited<
  ReturnType<PicketApiClient["restoreFinance"]>
>;
type AccountsResult = Awaited<ReturnType<PicketApiClient["listAccounts"]>>;
type AccountMutationResult = Awaited<
  ReturnType<PicketApiClient["createAccount"]>
>;
type CategoriesResult = Awaited<ReturnType<PicketApiClient["listCategories"]>>;
type CategoryMutationResult = Awaited<
  ReturnType<PicketApiClient["createCategory"]>
>;
type TransactionsResult = Awaited<
  ReturnType<PicketApiClient["listTransactions"]>
>;
type TransactionMutationResult = Awaited<
  ReturnType<PicketApiClient["createTransaction"]>
>;
type TransferMutationResult = Awaited<
  ReturnType<PicketApiClient["createTransfer"]>
>;
type RefundMutationResult = Awaited<ReturnType<PicketApiClient["createRefund"]>>;
type SplitMutationResult = Awaited<
  ReturnType<PicketApiClient["setTransactionSplits"]>
>;
type OcrFallbackMutationResult = Awaited<
  ReturnType<PicketApiClient["createOcrFallbackJob"]>
>;
type ReceiptMutationResult = Awaited<
  ReturnType<PicketApiClient["createReceipt"]>
>;
type ReceiptUpdateResult = Awaited<
  ReturnType<PicketApiClient["updateReceipt"]>
>;

export type LoadContractIsCorrect = Assert<
  Equal<LoadResult, FinanceSnapshotEnvelope>
>;
export type AdminOverviewContractIsCorrect = Assert<
  Equal<AdminOverviewResult, AdminOverview>
>;
export type AdminActionContractIsCorrect = Assert<
  Equal<AdminActionResult, AdminUserActionResult>
>;
export type SaveContractIsCorrect = Assert<
  Equal<SaveResult, SaveFinanceSnapshotResult>
>;
export type ExportContractIsCorrect = Assert<
  Equal<ExportResult, FinanceExportEnvelope>
>;
export type DeleteAccountContractIsCorrect = Assert<
  Equal<DeleteAccountMutationResult, DeleteAccountResult>
>;
export type ImportValidationContractIsCorrect = Assert<
  Equal<ImportValidationResult, FinanceImportSummary>
>;
export type RestoreContractIsCorrect = Assert<
  Equal<RestoreMutationResult, RestoreFinanceResult>
>;
export type AccountListContractIsCorrect = Assert<
  Equal<AccountsResult, AccountsResponse>
>;
export type AccountMutationContractIsCorrect = Assert<
  Equal<AccountMutationResult, AccountResponse>
>;
export type CategoryListContractIsCorrect = Assert<
  Equal<CategoriesResult, CategoriesResponse>
>;
export type CategoryMutationContractIsCorrect = Assert<
  Equal<CategoryMutationResult, CategoryResponse>
>;
export type TransactionListContractIsCorrect = Assert<
  Equal<TransactionsResult, TransactionsResponse>
>;
export type TransactionMutationContractIsCorrect = Assert<
  Equal<TransactionMutationResult, TransactionResponse>
>;
export type TransferMutationContractIsCorrect = Assert<
  Equal<TransferMutationResult, TransactionResponse>
>;
export type RefundMutationContractIsCorrect = Assert<
  Equal<RefundMutationResult, TransactionResponse>
>;
export type SplitMutationContractIsCorrect = Assert<
  Equal<SplitMutationResult, SetTransactionSplitsResponse>
>;
export type OcrFallbackMutationContractIsCorrect = Assert<
  Equal<OcrFallbackMutationResult, OcrFallbackJobResponse>
>;
export type ReceiptMutationContractIsCorrect = Assert<
  Equal<ReceiptMutationResult, ReceiptRecordResponse>
>;
export type ReceiptUpdateContractIsCorrect = Assert<
  Equal<ReceiptUpdateResult, ReceiptRecordResponse>
>;
