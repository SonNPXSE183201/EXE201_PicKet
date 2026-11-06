import type { Transaction, TransactionSplit } from "@picket/domain";
import { useEffect, useMemo, useState } from "react";
import { picketApi } from "@/core/api/client";
import { loadBudgetSplits } from "@/core/local/load-budget-splits";
import { useGuestFinance } from "@/core/local/guest-finance-context";
import { readOfflineCache, writeOfflineCache } from "@/core/sync/offline-cache";
import { useAuth } from "@/features/auth/auth-context";

export function useSpendingSplits(transactions: Transaction[], month: string) {
  const { session, localMode } = useAuth();
  const guest = useGuestFinance();
  const owner = session?.user.id;
  const token = session?.access_token;
  const revision = JSON.stringify([...transactions].sort((a,b) => a.id.localeCompare(b.id)));
  const rows = useMemo<Transaction[]>(() => JSON.parse(revision), [revision]);
  const [result,setResult] = useState<{owner:string;month:string;revision:string;splits:TransactionSplit[]} | null>(null);
  const [failed,setFailed] = useState<string | null>(null);
  useEffect(() => {
    if (localMode || !owner || !token || !picketApi) return;
    let active=true;
    const api=picketApi;
    const key=`${owner}:${month}:${revision}`;
    void loadBudgetSplits(rows,month,async ids => (await api.listTransactionSplitsByIds(token,ids)).splits)
      .then(async splits => {
        if (!active) return;
        setResult({owner,month,revision,splits}); setFailed(null);
        // Providers briefly expose [] before the durable history hydrates. A
        // successful zero-request load must not erase the last offline snapshot.
        try { if (rows.length > 0) await writeOfflineCache(owner,"spending-splits",{month,revision,splits}); } catch { /* Keep fresh results usable. */ }
      }).catch(async () => {
        const cached=await readOfflineCache<{month:string;revision:string;splits:TransactionSplit[]}>(owner,"spending-splits").catch(()=>null);
        if (!active) return;
        if (cached?.value.month===month && cached.value.revision===revision) { setResult({owner,...cached.value}); setFailed(null); }
        else setFailed(key);
      });
    return ()=> {active=false;};
  },[localMode,owner,token,month,revision,rows]);
  const ready=result !== null && result.owner===owner && result.month===month && result.revision===revision;
  const error=!localMode && failed===`${owner}:${month}:${revision}` ? "Chưa tải được phân bổ danh mục. Kết nối mạng rồi mở lại màn hình để thử lại." : null;
  return {splits:localMode ? Object.values(guest.data.splits).flat() : ready ? result.splits : [], loading:!localMode && !ready && !error, error};
}
