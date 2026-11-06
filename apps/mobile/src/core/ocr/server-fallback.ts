import type { OcrFallbackJob } from "@picket/domain";
import * as Crypto from "expo-crypto";

import { picketApi } from "@/core/api/client";
import { supabase } from "@/core/supabase/client";
import { fallbackOutbox, readFallbackIntent } from "./fallback-storage";
import { uploadVerifiedFallbackImage } from "./fallback-upload";
import { withLocalOwnerAccess } from "@/core/sync/offline-cache";

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
 * server OCR. Submitted requests are ambiguous on transport failure: retain
 * the private object and retry the durable key instead of deleting job input.
 */
export async function queueServerOcrFallback(input: {
  accessToken: string;
  userId: string;
  imageUri: string;
  localConfidence: number;
  captureId: string;
  imageRef: string;
  baseline: { title: string; amount: string; purchasedAt: string };
  signal?: AbortSignal;
}): Promise<{ job: OcrFallbackJob; baseline: typeof input.baseline }> {
  if (!supabase || !picketApi) {
    throw new Error("Cấu hình OCR máy chủ chưa sẵn sàng.");
  }
  const api = picketApi, storage = supabase.storage.from("picket-media");
  const existing = await readFallbackIntent(input.userId, input.captureId);
  const { extension } = imageMetadata(input.imageUri);
  let image: ArrayBuffer | null = null;
  const digest = async (bytes: ArrayBuffer) => Array.from(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes)), byte => byte.toString(16).padStart(2, "0")).join("");
  async function readImage() {
    if (image) return image;
    const response = await fetch(input.imageUri);
    if (!response.ok) throw new Error("Không đọc được ảnh hóa đơn.");
    image = await response.arrayBuffer();
    if (image.byteLength === 0 || image.byteLength > 10 * 1024 * 1024) throw new Error("Ảnh hóa đơn phải nhỏ hơn 10 MB.");
    return image;
  }
  const sha256 = existing?.sha256 ?? await digest(await readImage());
  const job = await fallbackOutbox.run({
    owner: input.userId, captureId: input.captureId, imageRef: input.imageRef,
    extension: existing?.extension ?? extension, sha256,
    localConfidence: input.localConfidence, baseline: input.baseline,
  }, {
    isActive: () => !input.signal?.aborted,
    upload: intent => withLocalOwnerAccess(input.userId,async () => {
      const bytes = await readImage();
      await uploadVerifiedFallbackImage(bytes, intent.sha256, {
        digest,
        upload: async () => {
          if (input.signal?.aborted) { const error = new Error("OCR attempt aborted"); error.name = "AbortError"; throw error; }
          const result = await storage.upload(intent.storagePath, bytes, {
            contentType: intent.extension === "jpg" ? "image/jpeg" : `image/${intent.extension}`, upsert: false,
          });
          if (result.error) throw result.error;
        },
        readExisting: async () => {
          if (input.signal?.aborted) throw new Error("OCR attempt aborted");
          const signed = await storage.createSignedUrl(intent.storagePath, 60);
          if (signed.error || !signed.data?.signedUrl) throw new Error("Cannot verify OCR image");
          const remote = await fetch(signed.data.signedUrl, { signal: input.signal });
          if (!remote.ok || Number(remote.headers.get("content-length")) > 10 * 1024 * 1024) throw new Error("Cannot verify OCR image");
          return remote.arrayBuffer();
        },
      });
    }),
    create: intent => withLocalOwnerAccess(input.userId,async () => (await api.createOcrFallbackJob(input.accessToken, {
      storagePath: intent.storagePath, localConfidence: intent.localConfidence, idempotencyKey: intent.captureId,
    })).job),
    get: async intent => (await api.getOcrFallbackJob(input.accessToken, intent.jobId!)).job,
  });
  const persisted = await readFallbackIntent(input.userId, input.captureId);
  if (!persisted?.baseline) throw new Error("Không mở được nội dung OCR gốc.");
  return { job, baseline: persisted.baseline };
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
