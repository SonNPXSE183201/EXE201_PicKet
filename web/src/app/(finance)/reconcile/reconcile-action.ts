'use server';
import { revalidatePath } from 'next/cache';
import { requireApiSession } from '@/core/auth/require-api-session';
export async function reconcile(_previous:{message:string;done:boolean},form:FormData) {
  const {api,accessToken}=await requireApiSession();
  const statementBalance=Number(form.get('statementBalance')),reason=String(form.get('reason')??'').trim(),requestId=String(form.get('requestId')??''),statementDate=String(form.get('statementDate')??'');
  if(!Number.isSafeInteger(statementBalance)||Math.abs(statementBalance)>9e12||!reason||reason.length>1000||!/^[0-9a-f-]{36}$/i.test(requestId)||!/^\d{4}-\d{2}-\d{2}$/.test(statementDate)||form.get('confirmation')!=='RECONCILE') return {done:false,message:'Kiểm tra ngày, số dư, lý do và xác nhận.'};
  try {
    const selectedTransactionIds=form.getAll('selectedTransactionIds').map(String);if(selectedTransactionIds.length>10000||selectedTransactionIds.some(id=>!/^[a-f0-9-]{36}$/i.test(id)))return {done:false,message:'Danh sách giao dịch không hợp lệ.'};
    const result=await api.reconcileWallet(accessToken,{requestId,accountId:String(form.get('accountId')),statementDate,statementBalance,selectedTransactionIds,reason});
    revalidatePath('/accounts');revalidatePath('/dashboard');
    return {done:true,message:`Đã đối soát. Chênh lệch ${result.difference.toLocaleString('vi-VN')} ₫${result.replayed?' (yêu cầu đã xử lý trước đó)':''}.`};
  }catch{return {done:false,message:'Chưa nhận được xác nhận. Giữ nguyên dữ liệu và thử lại để tránh tạo yêu cầu mới.'};}
}
