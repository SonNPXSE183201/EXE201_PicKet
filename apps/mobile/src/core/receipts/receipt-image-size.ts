/** Longest side kept for stored receipt photos: sharp enough to read and re-run OCR, a fraction of a camera original. */
export const RECEIPT_IMAGE_MAX_SIDE = 2000;
export const RECEIPT_IMAGE_QUALITY = 0.85;

/** Target size that keeps the aspect ratio, or null when the photo is already small enough. */
export function receiptTargetSize(width: number, height: number, maxSide = RECEIPT_IMAGE_MAX_SIDE) {
  if (!(width > 0 && height > 0)) return null;
  const longest = Math.max(width, height);
  if (longest <= maxSide) return null;
  const scale = maxSide / longest;
  return width >= height
    ? { width: maxSide, height: Math.max(1, Math.round(height * scale)) }
    : { width: Math.max(1, Math.round(width * scale)), height: maxSide };
}

/** Only JPEG photos are re-encoded; PNG/WebP keep their format (and storage extension). */
export function shouldOptimizeReceiptImage(uri: string) {
  return /\.jpe?g(?:\?.*)?$/i.test(uri);
}
