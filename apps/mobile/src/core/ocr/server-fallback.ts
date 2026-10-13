import type { OcrFallbackJob } from "@picket/domain";
import * as Crypto from "expo-crypto";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";

const supportedExtension = /\.(jpe?g|png|webp)(?:\?.*)?$/i;

function imageMetadata(imageUri: string) {
  const match = imageUri.match(supportedExtension);
  const extension = (match?.[1] ?? "jpg").toLowerCase().replace("jpeg", "jpg");
  return {
    extension,
    contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
  };
}

/**
 * Uploads only after explicit user consent, then queues the private image for
 * server OCR. If job creation fails, the just-uploaded object is removed.
 */
export async function queueServerOcrFallback(input: {
  accessToken: string;
  userId: string;
  imageUri: string;
  localConfidence: number;
}): Promise<OcrFallbackJob> {
  if (!supabase || !picketApi) {
    throw new Error("Cấu hình OCR máy chủ chưa sẵn sàng.");
  }
  const { extension, contentType } = imageMetadata(input.imageUri);
  const idempotencyKey = Crypto.randomUUID();
  const storagePath = `${input.userId}/ocr/${idempotencyKey}.${extension}`;
  const response = await fetch(input.imageUri);
  if (!response.ok) throw new Error("Không đọc được ảnh hóa đơn.");
  const image = await response.arrayBuffer();
  if (image.byteLength === 0 || image.byteLength > 10 * 1024 * 1024) {
    throw new Error("Ảnh hóa đơn phải nhỏ hơn 10 MB.");
  }
  const upload = await supabase.storage
    .from("picket-media")
    .upload(storagePath, image, { contentType, upsert: false });
  if (upload.error) throw upload.error;

  try {
    const result = await picketApi.createOcrFallbackJob(input.accessToken, {
      storagePath,
      localConfidence: Math.max(0, Math.min(1, input.localConfidence)),
      idempotencyKey,
    });
    return result.job;
  } catch (error) {
    await supabase.storage.from("picket-media").remove([storagePath]);
    throw error;
  }
}

const terminalStatuses = new Set([
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

function wait(milliseconds: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      const error = new Error("Polling aborted");
      error.name = "AbortError";
      reject(error);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function pollServerOcrFallback(input: {
  accessToken: string;
  jobId: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  onStatus?(job: OcrFallbackJob): void;
}): Promise<OcrFallbackJob> {
  if (!picketApi) throw new Error("Cấu hình Picket API chưa sẵn sàng.");
  const deadline = Date.now() + (input.timeoutMs ?? 45000);
  let latest: OcrFallbackJob | null = null;
  while (Date.now() < deadline) {
    const response = await picketApi.getOcrFallbackJob(
      input.accessToken,
      input.jobId,
      input.signal,
    );
    latest = response.job;
    input.onStatus?.(latest);
    if (terminalStatuses.has(latest.status)) return latest;
    await wait(1500, input.signal);
  }
  if (latest) return latest;
  throw new Error("Không đọc được trạng thái OCR máy chủ.");
}
