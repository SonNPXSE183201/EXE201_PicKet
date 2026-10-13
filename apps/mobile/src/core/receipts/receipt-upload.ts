import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";

import { supabase } from "@/core/supabase/client";

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
}) {
  if (!supabase) throw new Error("Cấu hình Supabase chưa sẵn sàng.");
  const storagePath = `${input.userId}/receipts/${Crypto.randomUUID()}.${input.extension}`;
  const result = await supabase.storage.from("picket-media").upload(
    storagePath,
    input.image,
    { contentType: input.contentType, upsert: false },
  );
  if (result.error) throw result.error;
  return storagePath;
}

export async function removeReceiptImage(storagePath: string) {
  if (!supabase) return;
  await supabase.storage.from("picket-media").remove([storagePath]);
}
