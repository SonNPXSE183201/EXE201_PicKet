'use server';
import { revalidatePath } from 'next/cache';
import { requireApiSession } from '@/core/auth/require-api-session';
export async function bulkArchive(items:Array<{id:string;version:number}>,confirmation:string){
 const {api,accessToken}=await requireApiSession();
 if(confirmation!=='ARCHIVE'||!items.length||items.length>100||new Set(items.map(i=>i.id)).size!==items.length||items.some(i=>!/^[a-f0-9-]{36}$/i.test(i.id)||!Number.isSafeInteger(i.version)||i.version<1))throw Error('Chọn tối đa 100 giao dịch và xác nhận ARCHIVE.');
 const results:Array<{id:string;ok:boolean}>=[];for(const row of items){try{await api.archiveTransaction(accessToken,row.id,row.version);results.push({id:row.id,ok:true});}catch{results.push({id:row.id,ok:false});}}
 revalidatePath('/transactions');revalidatePath('/accounts');revalidatePath('/dashboard');return results;
}
