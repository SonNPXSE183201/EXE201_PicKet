export type ThumbnailImage = { width: number; height: number; release(): void };
export async function renderReceiptThumbnail<T extends ThumbnailImage>(context: {
  render(): Promise<T>; resize(size: { width: number; height: number }): void; release(): void;
}, save: (image: T) => Promise<{ uri: string; base64?: string }>, discard: (uri: string) => void): Promise<string> {
  let source: T | undefined, thumbnail: T | undefined, output: string | undefined;
  try {
    source = await context.render();
    if (!Number.isFinite(source.width) || !Number.isFinite(source.height) || source.width <= 0 || source.height <= 0) throw new Error("Invalid thumbnail dimensions");
    const scale = Math.min(1, 96 / Math.max(source.width, source.height));
    if (scale < 1) {
      context.resize({ width: Math.max(1, Math.round(source.width * scale)), height: Math.max(1, Math.round(source.height * scale)) });
      thumbnail = await context.render();
    }
    const selected = thumbnail ?? source;
    if (!(selected.width > 0 && selected.height > 0 && selected.width <= 96 && selected.height <= 96)) throw new Error("Invalid resized thumbnail dimensions");
    const result = await save(selected); output = result.uri;
    if (!result.base64 || result.base64.length > 131_072) throw new Error("Invalid thumbnail encoding");
    return `data:image/jpeg;base64,${result.base64}`;
  } finally {
    // Each SharedObject owns a reference, even when native bitmaps are shared.
    try { thumbnail?.release(); } catch { /* Do not skip remaining cleanup. */ }
    try { source?.release(); } catch { /* Do not skip remaining cleanup. */ }
    try { context.release(); } catch { /* Preserve the original operation result. */ }
    if (output) { try { discard(output); } catch { /* Retry cache cleanup later. */ } }
  }
}
