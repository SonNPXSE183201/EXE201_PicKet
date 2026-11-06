import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";

import { supabase } from "@/core/supabase/client";
import { uploadVerifiedFallbackImage } from "@/core/ocr/fallback-upload";
import { withLocalOwnerAccess } from "@/core/sync/offline-cache";

function metadata(uri: string) {
  const match = uri.match(/\.(jpe?g|png|webp)(?:\?.*)?$/i);
  const extension = (match?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
  return {
    extension,
    contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
  };
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function inspectReceiptImage(imageUri: string) {
  const bytes = await new File(imageUri).arrayBuffer();
  if (bytes.byteLength === 0 || bytes.byteLength > 10 * 1024 * 1024) {
    throw new Error("Ảnh hóa đơn phải nhỏ hơn 10 MB.");
  }
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes);
  return { bytes, sha256: hex(digest), ...metadata(imageUri) };
}

export async function uploadReceiptImage(input: {
  userId: string;
  image: ArrayBuffer;
  extension: string;
  contentType: string;
  receiptId: string;
  sha256: string;
}) {
  if (!supabase) throw new Error("Cấu hình Supabase chưa sẵn sàng.");
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(input.receiptId)
    || !/^[A-Za-z0-9_-]+$/.test(input.userId) || !["jpg", "png", "webp"].includes(input.extension)) {
    throw new Error("Invalid durable receipt image identity");
  }
  const storagePath = `${input.userId}/receipts/${input.receiptId}.${input.extension}`;
  const storage = supabase.storage.from("picket-media");
  await withLocalOwnerAccess(input.userId,()=>uploadVerifiedFallbackImage(input.image, input.sha256, {
    digest: async bytes => hex(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)),
    upload: async () => {
      const result = await storage.upload(storagePath, input.image, { contentType: input.contentType, upsert: false });
      if (result.error) throw result.error;
    },
    readExisting: async () => {
      const signed = await storage.createSignedUrl(storagePath, 60);
      if (signed.error || !signed.data?.signedUrl) throw new Error("Cannot verify receipt upload");
      const response = await fetch(signed.data.signedUrl);
      if (!response.ok || Number(response.headers.get("content-length")) > 10 * 1024 * 1024) throw new Error("Cannot verify receipt upload");
      return response.arrayBuffer();
    },
  }));
  return storagePath;
}

export async function removeReceiptImage(storagePath: string) {
  if (!supabase) return;
  await supabase.storage.from("picket-media").remove([storagePath]);
}
