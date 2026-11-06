import { useTransactions } from "@/features/transactions/transactions-context";

// Share the paginated and per-user cached history. A second network-only
// fetch makes Insights and Planning unusable when the device is offline.
export function useTransactionHistory() {
  const { transactions, loading, error, refresh } = useTransactions();
  return { transactions, loading, error, refresh };
}
