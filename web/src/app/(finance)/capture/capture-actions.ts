'use server';
import { revalidatePath } from 'next/cache';
import { requireApiSession } from '@/core/auth/require-api-session';
import type { CreateReceiptRecordRequest } from '@picket/domain';
function ownedPath(path:string,owner:string,folder='receipts'){if(!new RegExp('^'+owner+'/'+folder+'/[a-f0-9-]{36}\\.jpg$','i').test(path))throw Error('Ảnh không thuộc tài khoản hiện tại.');}
export async function submitReceipt(input:CreateReceiptRecordRequest){
 const {api,accessToken,claims}=await requireApiSession();ownedPath(input.storagePath,String(claims.sub));
 if(!input.imageSha256||! /^[a-f0-9]{64}$/.test(input.imageSha256)||!input.merchant?.trim()||input.merchant.length>160||!Number.isSafeInteger(input.detectedTotal)||input.detectedTotal!<1||input.detectedTotal!>9e12||!input.purchasedAt||Number.isNaN(Date.parse(input.purchasedAt)))throw Error('Hãy kiểm tra cửa hàng, ngày mua và tổng tiền.');
 const duplicates=await api.findDuplicateReceipts(accessToken,{imageSha256:input.imageSha256});
 const existing=duplicates.duplicates.find(d=>d.matchType==='exact_hash');
 if(existing)return {id:existing.id,duplicate:true};
 const {receipt}=await api.createReceipt(accessToken,{...input,currencyCode:'VND',ocrProvider:'manual',reviewRequired:true,lineItems:[],rawText:null});
 revalidatePath('/receipts');revalidatePath('/dashboard');return {id:receipt.id,duplicate:false};
}
export async function startReceiptOcr(storagePath:string,idempotencyKey:string){
 const {api,accessToken,claims}=await requireApiSession();ownedPath(storagePath,String(claims.sub),'ocr');
 if(!/^[a-f0-9-]{36}$/i.test(idempotencyKey))throw Error('Invalid request');
 return (await api.createOcrFallbackJob(accessToken,{storagePath,localConfidence:0,idempotencyKey})).job;
}
export async function receiptOcrStatus(id:string){const {api,accessToken}=await requireApiSession();if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('Invalid job');return (await api.getOcrFallbackJob(accessToken,id)).job;}
