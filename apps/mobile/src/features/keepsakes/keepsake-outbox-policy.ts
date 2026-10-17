type PhotoIntent = { photoUri?: string | null; mediaPath?: string | null; photoUploadRequired?: boolean; pickedPhotoUri?: string | null };

export function nextKeepsakePhotoUploadRequired(item: PhotoIntent): boolean {
  if (item.pickedPhotoUri) return true;
  // Unknown legacy rows may contain a user-selected replacement. Never infer
  // that it can be dropped from the presence of a remote mediaPath alone.
  return item.photoUploadRequired ?? Boolean(item.photoUri);
}

export function planKeepsakePhotoReplay(item: PhotoIntent) {
  const upload = nextKeepsakePhotoUploadRequired(item);
  if (upload && !item.photoUri) throw new Error("Missing pending photo.");
  return { uploadUri: upload ? item.photoUri! : null, mediaPath: item.mediaPath ?? null };
}

export function planKeepsakeReplay<T extends { version?: number }>(item: T) {
  return item.version
    ? { action: "update" as const, expectedVersion: item.version }
    : { action: "create" as const };
}

export function mergeKeepsakeOutbox<T extends { id: string }>(remote: T[], pending: T[]) {
  const pendingIds = new Set(pending.map((item) => item.id));
  return [...remote.filter((item) => !pendingIds.has(item.id)), ...pending];
}

export function shouldQueueKeepsakeFailure(status?: number) {
  return status === undefined || status === 0 || status >= 500;
}
