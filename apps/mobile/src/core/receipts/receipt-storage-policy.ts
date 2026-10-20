/** OCR job objects expire; only owned receipt objects are durable attachments. */
export function durableReceiptStoragePath(owner: string, path: string | null) {
  if (!/^[A-Za-z0-9_-]+$/.test(owner) || !path) return null;
  const prefix = `${owner}/receipts/`;
  if (!path.startsWith(prefix)) return null;
  const name = path.slice(prefix.length);
  return /^[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i.test(name) ? path : null;
}
