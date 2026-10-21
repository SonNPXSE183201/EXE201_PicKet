import { requireApiSession } from '@/core/auth/require-api-session';
import { FinancePageHeader } from '../finance-ui';
import { ReconcileForm } from './reconcile-form';
import { loadAllTransactions } from '@/core/finance/load-transactions';
export default async function ReconcilePage() {
  const {api,accessToken,claims}=await requireApiSession();
  const [{accounts},transactions]=await Promise.all([api.listAccounts(accessToken),loadAllTransactions(api,accessToken)]);
  return <><FinancePageHeader title="Đối soát ví" description="So số dư trong Picket với sao kê và ghi điều chỉnh khi cần."/><article className="finance-panel"><ReconcileForm accounts={accounts.filter(a=>!a.archived&&!a.deletedAt)} transactions={transactions} owner={String(claims.sub)} requestId={crypto.randomUUID()}/></article></>;
}
