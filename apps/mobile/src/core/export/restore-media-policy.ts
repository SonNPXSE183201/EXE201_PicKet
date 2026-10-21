/** A restore rejection after submission is ambiguous: the server may have committed. */
export async function restoreWithUploadedMedia<T>(options: {
  prepare(uploaded: string[]): Promise<void>;
  validate(): Promise<unknown>;
  commit(): Promise<T>;
  remove(uploaded: string[]): Promise<unknown>;
}): Promise<T> {
  const uploaded: string[] = [];
  let submitted = false;
  try {
    await options.prepare(uploaded);
    await options.validate();
    submitted = true;
    return await options.commit();
  } finally {
    // Only pre-submit failures prove these objects cannot belong to restored
    // rows. Retain uncertain objects until a fresh server audit can resolve them.
    if (!submitted && uploaded.length) {
      try { await options.remove(uploaded); } catch { /* Preserve original error. */ }
    }
  }
}
