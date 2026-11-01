export type CorpusEntry = { name: string; file: string; sha256: string };
export function qaEnabled(flag: boolean, applicationId: string | null | undefined, path: string): boolean {
  return flag && applicationId === "com.picket.mobile.bugqa" && /^file:\/\/\/data\/(?:user\/0|data)\/com\.picket\.mobile\.bugqa\/files\/?$/.test(path);
}
export async function runCorpus<T extends object>(entries: CorpusEntry[], scan: (entry: CorpusEntry) => Promise<T>, save: (result: CorpusEntry & (T | { error: string })) => void): Promise<void> {
  for (const entry of entries) {
    try { save({ ...entry, ...await scan(entry) }); }
    catch (error) { save({ ...entry, error: String(error) }); }
  }
}
export function validManifest(value: unknown): value is CorpusEntry[] {
  if (!Array.isArray(value) || value.length !== 40) return false;
  return value.every(e => e && typeof e.name === "string" && typeof e.file === "string" && /^\d{2}\.(?:jpg|jpeg|png|webp)$/i.test(e.file) && typeof e.sha256 === "string" && /^[a-f0-9]{64}$/.test(e.sha256)) && new Set(value.map(e => e.file)).size === 40;
}
