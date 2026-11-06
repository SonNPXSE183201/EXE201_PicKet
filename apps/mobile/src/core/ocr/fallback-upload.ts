/** Recover a lost immutable-upload acknowledgement by verifying exact bytes.
 * No overwrite or delete operation is exposed to this protocol. */
export async function uploadVerifiedFallbackImage(image: ArrayBuffer, sha256: string, io: {
  digest(bytes: ArrayBuffer): Promise<string>;
  upload(): Promise<void>;
  readExisting(): Promise<ArrayBuffer>;
}) {
  if (image.byteLength === 0 || image.byteLength > 10 * 1024 * 1024 || await io.digest(image) !== sha256) {
    throw new Error("OCR image identity mismatch");
  }
  try { await io.upload(); }
  catch (uploadError) {
    try {
      const existing = await io.readExisting();
      if (existing.byteLength === image.byteLength && await io.digest(existing) === sha256) return;
    } catch { /* The original failure remains actionable; do not guess success. */ }
    throw uploadError;
  }
}
