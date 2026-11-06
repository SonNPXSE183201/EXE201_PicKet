type RestoreOutcome = "restored" | "unconfirmed" | "refresh-failed" | "session-changed" | "busy";
type RestoreOptions = { isCurrent(): boolean; restore(): Promise<void>; refresh(): Promise<void> };

export async function refreshRestoredProviders(refreshers: ((options?: { throwOnError?: boolean }) => Promise<void>)[]): Promise<void> {
  const results = await Promise.allSettled(refreshers.map(refresh => Promise.resolve().then(() => refresh({ throwOnError: true }))));
  const failure = results.find(result => result.status === "rejected");
  if (failure?.status === "rejected") throw failure.reason;
}

/** One runner belongs to one prepared backup. Re-read the backup to start a new attempt. */
export function createRestoreRunner() {
  let running = false, confirmed = false, uncertain = false;
  return async (options: RestoreOptions): Promise<RestoreOutcome> => {
    if (running) return "busy";
    if (!options.isCurrent()) return "session-changed";
    if (uncertain) return "unconfirmed";
    running = true;
    try {
      if (!confirmed) {
        try { await options.restore(); confirmed = true; }
        catch { uncertain = true; return options.isCurrent() ? "unconfirmed" : "session-changed"; }
      }
      if (!options.isCurrent()) return "session-changed";
      try { await options.refresh(); }
      catch { return options.isCurrent() ? "refresh-failed" : "session-changed"; }
      return options.isCurrent() ? "restored" : "session-changed";
    } finally { running = false; }
  };
}

const validationMessages = {
  fileUnreadable: "fileUnreadable", fileTooLarge: "fileTooLarge", guestFormatOnly: "guestFormatOnly", passwordRequired: "passwordRequired",
  "Sai mật khẩu hoặc bản sao đã hỏng.": "passwordOrCorrupt",
} as const;
export function backupValidationMessage(error: unknown): string {
  if (error instanceof Error && Object.hasOwn(validationMessages, error.message)) return validationMessages[error.message as keyof typeof validationMessages];
  return "validationFailed";
}
