import type { FinanceExportEnvelope, FinancePayload } from "@picket/domain";
import { fromByteArray, toByteArray } from "base64-js";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { picketApi } from "@/core/api/client";
import { openBackupEnvelope, sealBackupEnvelope } from "@/core/export/backup-codec";
import { validateGuestBackupPayload, type GuestBackupPayload } from "@/core/export/guest-backup-model";
import { guestOwnerId, type GuestFinance } from "@/core/local/guest-finance";
import { supabase } from "@/core/supabase/client";
import { listKeepsakes, replaceKeepsakesForOwner } from "@/features/keepsakes/keepsake-store";
import { listGuestReceipts, replaceGuestReceipts } from "@/core/receipts/guest-receipt-store";
import { restoreWithUploadedMedia } from "./restore-media-policy";
import { readKeepsakePhoto, withKeepsakePhotoLease, writeKeepsakePhoto } from "@/features/keepsakes/keepsake-photo-storage";
import { withLocalOwnerAccess } from "@/core/sync/offline-cache";

const MAX_MEDIA_BYTES = 50_000_000;
const MAX_SINGLE_IMAGE_BYTES = 10_485_760;
const imageFields = [["entries", "receiptPath"], ["keepsakes", "photoPath"]] as const;

function escapeCsv(value: unknown) {
  let text = String(value ?? "");
  if (/^\s*[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function financeCsv(data: FinancePayload) {
  const rows = [
    ["id", "date", "type", "title", "amount_vnd", "wallet_id", "category", "note", "refund_of"],
    ...data.entries.map((entry) => [entry.id, entry.date, entry.refundOf ? "refund" : entry.type,
      entry.title, entry.amount, entry.walletId, entry.category, entry.note, entry.refundOf ?? ""]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n")}`;
}

async function shareText(owner:string,contents: string, extension: string, mimeType: string) {
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) throw new Error("Không thể chia sẻ bản sao trên thiết bị này.");
  const uri = `${FileSystem.cacheDirectory}picket-${Crypto.randomUUID()}.${extension}`;
  await withLocalOwnerAccess(owner,()=>FileSystem.writeAsStringAsync(uri, contents, { encoding: FileSystem.EncodingType.UTF8 }));
  await Sharing.shareAsync(uri, { dialogTitle:"Lưu dữ liệu Picket", mimeType });
}

function requireCloud() {
  if (!picketApi || !supabase) throw new Error("Chưa tạo được bản sao. Hãy đăng nhập và thử lại.");
  return { api:picketApi, storage:supabase.storage.from("picket-media") };
}

function mediaSlots(payload: FinancePayload) {
  const slots: { item: Record<string, unknown>; field: "receiptPath" | "photoPath" }[] = [];
  for (const [group, field] of imageFields) {
    for (const item of payload[group]) slots.push({ item:item as unknown as Record<string, unknown>, field });
  }
  return slots;
}

export async function exportFinanceCsv(token: string,userId:string) {
  const { api } = requireCloud();
  const exported = await api.exportFinance(token);
  await shareText(userId,financeCsv(exported.data), "csv", "text/csv");
}

export async function exportEncryptedBackup(token: string, userId: string, password: string) {
  if (password.length < 12) throw new Error("Mật khẩu bản sao cần ít nhất 12 ký tự.");
  const { api, storage } = requireCloud();
  const exported = await api.exportFinance(token);
  const payload = JSON.parse(JSON.stringify(exported.data)) as FinancePayload;
  const media: Record<string, string> = {};
  let totalBytes = 0;
  for (const { item, field } of mediaSlots(payload)) {
    const path = item[field];
    if (path === null || path === undefined) continue;
    if (typeof path !== "string" || !path.startsWith(`${userId}/`) || path.includes("..")) {
      throw new Error("Ảnh không thuộc vùng lưu trữ của tài khoản.");
    }
    const { data, error } = await storage.download(path);
    if (error || !data) throw new Error("Không tải được ảnh để sao lưu.");
    const bytes = new Uint8Array(await data.arrayBuffer());
    totalBytes += bytes.length;
    if (bytes.length > MAX_SINGLE_IMAGE_BYTES || totalBytes > MAX_MEDIA_BYTES) throw new Error("Ảnh vượt giới hạn sao lưu 50 MB.");
    const key = `image:${Object.keys(media).length}`;
    media[key] = fromByteArray(bytes);
    item[field] = key;
  }
  const salt = await Crypto.getRandomBytesAsync(32);
  const nonce = await Crypto.getRandomBytesAsync(12);
  const envelope = await sealBackupEnvelope("picket-backup-v1", { data:payload, media }, password, salt, nonce);
  await shareText(userId,envelope, "picket", "application/octet-stream");
}

export interface DecryptedBackup { data: FinancePayload; media: Record<string, string> }
export async function decryptEncryptedBackup(encoded: string, password: string): Promise<DecryptedBackup> {
  const parsed = await openBackupEnvelope<DecryptedBackup>(encoded, "picket-backup-v1", password);
  if (!parsed || typeof parsed !== "object" || !parsed.data ||
      !Array.isArray(parsed.data.entries) || !Array.isArray(parsed.data.keepsakes) ||
      !parsed.media || typeof parsed.media !== "object" || Array.isArray(parsed.media)) throw new Error("Dữ liệu bản sao không hợp lệ.");
  let totalBytes = 0;
  for (const { item, field } of mediaSlots(parsed.data)) {
    const reference = item[field];
    if (reference === null || reference === undefined) continue;
    if (typeof reference !== "string" || !/^image:\d+$/.test(reference) || typeof parsed.media[reference] !== "string") throw new Error("Thiếu ảnh trong bản sao.");
    const size = toByteArray(parsed.media[reference]).length;
    totalBytes += size;
    if (size > MAX_SINGLE_IMAGE_BYTES || totalBytes > MAX_MEDIA_BYTES) throw new Error("Ảnh trong bản sao vượt giới hạn.");
  }
  return parsed;
}

function imageType(bytes: Uint8Array) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension:"jpg", mime:"image/jpeg" };
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { extension:"png", mime:"image/png" };
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return { extension:"webp", mime:"image/webp" };
  throw new Error("Định dạng ảnh không được hỗ trợ.");
}

export async function restoreEncryptedBackup(token: string, userId: string, currentRevision: number, backup: DecryptedBackup) {
  const { api, storage } = requireCloud();
  const payload = JSON.parse(JSON.stringify(backup.data)) as FinancePayload;
  const envelope: FinanceExportEnvelope = { format:"picket-export-v1", schemaVersion:1,
    exportedAt:new Date().toISOString(), revision:currentRevision, data:payload };
  return restoreWithUploadedMedia({
    prepare: async uploaded => {
    for (const { item, field } of mediaSlots(payload)) {
      const reference = item[field];
      if (reference === null || reference === undefined) continue;
      if (typeof reference !== "string" || !/^image:\d+$/.test(reference)) throw new Error("Tham chiếu ảnh không hợp lệ.");
      const encoded = backup.media[reference];
      if (typeof encoded !== "string") throw new Error("Thiếu ảnh trong bản sao.");
      const bytes = toByteArray(encoded);
      const { extension, mime } = imageType(bytes);
      const path = `${userId}/backup-restored/${Crypto.randomUUID()}.${extension}`;
      const { error } = await withLocalOwnerAccess(userId,()=>storage.upload(path, bytes, { contentType:mime, upsert:false }));
      if (error) throw error;
      uploaded.push(path);
      item[field] = path;
    }
    },
    validate: () => withLocalOwnerAccess(userId,()=>api.validateFinanceImport(token, envelope)),
    commit: () => withLocalOwnerAccess(userId,()=>api.restoreFinance(token, { confirmation:"RESTORE", expectedRevision:currentRevision, export:envelope })),
    remove: paths => storage.remove(paths),
  });
}

/** Device-only backups use the same AES-GCM/PBKDF2 envelope, but a distinct payload contract. */
export async function exportGuestBackup(finance: GuestFinance, password: string) {
  return withKeepsakePhotoLease(guestOwnerId, () => exportGuestBackupWithLease(finance, password));
}
async function exportGuestBackupWithLease(finance: GuestFinance, password: string) {
  if (password.length < 12) throw new Error("Mật khẩu bản sao cần ít nhất 12 ký tự.");
  const keepsakes = await listKeepsakes(guestOwnerId);
  const receipts = await listGuestReceipts();
  const media: Record<string, string> = {};
  const copies = keepsakes.map((item) => ({ ...item }));
  let totalBytes = 0;
  const allowedDirectory = `${FileSystem.documentDirectory ?? ""}keepsakes/${guestOwnerId}/`;
  for (const item of copies) {
    if (!item.photoUri) continue;
    if (!FileSystem.documentDirectory || !item.photoUri.startsWith(allowedDirectory) || item.photoUri.includes("..")) throw new Error("Ảnh kỷ vật nằm ngoài vùng lưu trữ của ứng dụng.");
    const encoded = (await readKeepsakePhoto(guestOwnerId, item.photoUri)).base64;
    const bytes = toByteArray(encoded);
    totalBytes += bytes.length;
    if (bytes.length > MAX_SINGLE_IMAGE_BYTES || totalBytes > MAX_MEDIA_BYTES) throw new Error("Ảnh vượt giới hạn sao lưu 50 MB.");
    const reference = `image:${Object.keys(media).length}`;
    media[reference] = encoded;
    item.photoUri = reference;
  }
  for (const receipt of receipts) {
    totalBytes += toByteArray(receipt.imageBase64).length;
    if (totalBytes > MAX_MEDIA_BYTES) throw new Error("Ảnh vượt giới hạn sao lưu 50 MB.");
  }
  const salt = await Crypto.getRandomBytesAsync(32);
  const nonce = await Crypto.getRandomBytesAsync(12);
  const envelope = await sealBackupEnvelope("picket-guest-backup-v1", { finance, keepsakes:copies, receipts, media }, password, salt, nonce);
  await shareText(guestOwnerId,envelope, "picket", "application/octet-stream");
}

export async function decryptGuestBackup(encoded: string, password: string): Promise<GuestBackupPayload> {
  const payload = validateGuestBackupPayload(await openBackupEnvelope(encoded, "picket-guest-backup-v1", password));
  let totalBytes = 0;
  for (const encodedImage of Object.values(payload.media)) {
    if (typeof encodedImage !== "string") throw new Error("Ảnh trong bản sao không hợp lệ.");
    const size = toByteArray(encodedImage).length;
    totalBytes += size;
    if (size > MAX_SINGLE_IMAGE_BYTES || totalBytes > MAX_MEDIA_BYTES) throw new Error("Ảnh trong bản sao vượt giới hạn.");
  }
  for (const receipt of payload.receipts) {
    totalBytes += toByteArray(receipt.imageBase64).length;
    if (totalBytes > MAX_MEDIA_BYTES) throw new Error("Ảnh trong bản sao vượt giới hạn.");
  }
  return payload;
}

export async function restoreGuestBackup(backup: GuestBackupPayload, replaceFinance: (value: GuestFinance) => Promise<void>) {
  return withKeepsakePhotoLease(guestOwnerId, () => restoreGuestBackupWithLease(backup, replaceFinance));
}
async function restoreGuestBackupWithLease(backup: GuestBackupPayload, replaceFinance: (value: GuestFinance) => Promise<void>) {
  validateGuestBackupPayload(backup);
  if (!FileSystem.documentDirectory) throw new Error("Không tìm được vùng lưu trữ trên thiết bị.");
  const oldKeepsakes = await listKeepsakes(guestOwnerId);
  const oldReceipts = await listGuestReceipts();
  const directory = `${FileSystem.documentDirectory}keepsakes/${guestOwnerId}/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates:true });
  const created: string[] = [];
  const restored = backup.keepsakes.map((item) => ({ ...item }));
  let rowsReplaced = false;
  let receiptsReplaced = false;
  try {
    for (const item of restored) {
      if (!item.photoUri) continue;
      const encoded = backup.media[item.photoUri];
      const uri = await writeKeepsakePhoto(guestOwnerId, toByteArray(encoded));
      created.push(uri);
      item.photoUri = uri;
    }
    await replaceKeepsakesForOwner(guestOwnerId, restored);
    rowsReplaced = true;
    await replaceGuestReceipts(backup.receipts);
    receiptsReplaced = true;
    await replaceFinance(backup.finance);
  } catch (error) {
    if (rowsReplaced || receiptsReplaced) {
      try {
        if (receiptsReplaced) await replaceGuestReceipts(oldReceipts);
        if (rowsReplaced) await replaceKeepsakesForOwner(guestOwnerId, oldKeepsakes);
      }
      catch { throw new Error("Khôi phục thất bại và không hoàn tác được danh sách kỷ vật. Ảnh phục hồi được giữ lại để tránh mất dữ liệu."); }
    }
    for (const uri of created) await FileSystem.deleteAsync(uri, { idempotent:true }).catch(() => undefined);
    throw error;
  }
  // Older cache/readers can still reference these files. Bounded orphan cleanup
  // uses queue/cache references and an age grace period after successful restore.
}
