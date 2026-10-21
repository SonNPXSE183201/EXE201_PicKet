import { createPhotoLeaseGate, selectPhotoOrphans, type PhotoFile } from "../../features/keepsakes/keepsake-photo-vault";

export const capturePhotoLeases = createPhotoLeaseGate();

export async function collectCapturePhotoOrphans(owner: string, io: {
  references(): Promise<string[]>;
  files(): PhotoFile[];
  prefixes: string[];
  remove(uri: string): void;
  now: number;
}): Promise<number | null> {
  void owner; void io; void selectPhotoOrphans;
  return 0;
}
