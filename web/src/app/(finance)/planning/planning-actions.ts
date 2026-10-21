'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { BudgetMethod } from '@picket/domain';
import { requireApiSession } from '@/core/auth/require-api-session';

function monthOf(form:FormData) {
  const value=String(form.get('month')??'');
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new Error('Tháng không hợp lệ.');
  return value;
}
async function save(month:string,operation:()=>Promise<unknown>) {
  try {await operation();}catch {redirect('/planning?month='+month+'&error=save');}
  revalidatePath('/planning');redirect('/planning?month='+month+'&done=1');
}
export async function changeMethod(form:FormData) {
  const {api,accessToken}=await requireApiSession();const month=monthOf(form);
  const method=String(form.get('method')) as BudgetMethod;
  if(!['simple','envelope','zero_based','fifty_thirty_twenty','event'].includes(method)) throw new Error('Phương pháp không hợp lệ.');
  await save(month,()=>api.setBudgetMethod(accessToken,method));
}
export async function transferLimit(form:FormData) {
  const {api,accessToken}=await requireApiSession();const month=monthOf(form),amount=Number(form.get('amount'));
  if(!Number.isSafeInteger(amount)||amount<=0||amount>9e12) throw new Error('Số tiền không hợp lệ.');
  await save(month,()=>api.transferBudgetLimit(accessToken,{month,amount,sourceBudgetId:String(form.get('source')),destinationBudgetId:String(form.get('destination'))}));
}
export async function closeMonth(form:FormData) {
  const {api,accessToken}=await requireApiSession();const month=monthOf(form);
  if(form.get('confirmation')!=='CLOSE') redirect('/planning?month='+month+'&error=confirmation');
  const note=String(form.get('note')??'').trim();if(note.length>1000) throw new Error('Ghi chú quá dài.');
  await save(month,()=>api.closeBudgetMonth(accessToken,{month,rollover:form.get('rollover')==='on',note}));
}
