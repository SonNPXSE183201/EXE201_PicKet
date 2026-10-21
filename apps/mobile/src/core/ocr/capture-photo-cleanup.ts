import { createPhotoLeaseGate, selectPhotoOrphans, type PhotoFile } from "../../features/keepsakes/keepsake-photo-vault";

export const capturePhotoLeases = createPhotoLeaseGate();

export async function collectCapturePhotoOrphans(owner: string, io: {
  references(): Promise<string[]>;
  files(): PhotoFile[];
  prefixes: string[];
  remove(uri: string): void;
  now: number;
}): Promise<number | null> {
  return capturePhotoLeases.clean(owner, async () => {
    let references: Set<string>;
    try { references = new Set(await io.references()); } catch { return 0; }
    const candidates = selectPhotoOrphans(io.files(), io.prefixes, references, io.now);
    let removed = 0;
    for (const file of candidates) {
      try { io.remove(file.uri); removed++; } catch { /* Keep it for the next bounded sweep. */ }
    }
    return removed;
  });
}
