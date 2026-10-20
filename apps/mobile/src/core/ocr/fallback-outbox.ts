export type FallbackInput = {
  owner: string; captureId: string; imageRef: string; sha256: string;
  extension: string; localConfidence: number;
  baseline?: { title: string; amount: string; purchasedAt: string };
};
export type FallbackIntent = FallbackInput & {
  version: 1; storagePath: string; phase: "prepared" | "submitted"; jobId: string | null;
};
type JobIdentity = { id: string; storagePath: string };
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
function validInput(input: FallbackInput) {
  if (!/^[A-Za-z0-9_-]+$/.test(input.owner) || !uuid.test(input.captureId)
    || !input.imageRef || !/^[a-f0-9]{64}$/.test(input.sha256)
    || !["jpg", "png", "webp"].includes(input.extension)
    || !Number.isFinite(input.localConfidence) || input.localConfidence < 0 || input.localConfidence > 1) {
    throw new Error("Invalid OCR fallback identity");
  }
}
function canonical(saved: FallbackIntent | null, input: FallbackInput): FallbackIntent {
  if (!saved) throw new Error("OCR fallback intent was not persisted");
  validInput(saved);
  if (saved.baseline && (typeof saved.baseline.title !== "string" || typeof saved.baseline.amount !== "string"
    || typeof saved.baseline.purchasedAt !== "string" || !Number.isFinite(Date.parse(saved.baseline.purchasedAt)))) {
    throw new Error("Invalid OCR fallback baseline");
  }
  if (saved.version !== 1 || saved.owner !== input.owner || saved.captureId !== input.captureId
    || saved.imageRef !== input.imageRef || saved.sha256 !== input.sha256 || saved.extension !== input.extension
    || saved.storagePath !== `${input.owner}/ocr/${input.captureId}.${input.extension}`
    || !["prepared", "submitted"].includes(saved.phase)
    || !(saved.jobId === null || typeof saved.jobId === "string" && saved.jobId.length > 0)
    || saved.jobId !== null && saved.phase !== "submitted") {
    throw new Error("OCR fallback identity mismatch");
  }
  return saved;
}

/** Credential-free, first-write-wins journal. Never removes a submitted image. */
export function createFallbackOutbox(io: {
  read(owner: string, captureId: string): Promise<FallbackIntent | null>;
  write(intent: FallbackIntent): Promise<void>;
}) {
  const pending = new Map<string, Promise<unknown>>();
  return {
    run<J extends JobIdentity>(input: FallbackInput, effects: {
      upload(intent: FallbackIntent): Promise<void>;
      create(intent: FallbackIntent): Promise<J>;
      get(intent: FallbackIntent): Promise<J>;
      isActive?(): boolean;
    }): Promise<J> {
      validInput(input);
      const key = `${input.owner}:${input.captureId}`;
      const operation = (pending.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
        const checkActive = () => {
          if (effects.isActive?.() === false) { const error = new Error("OCR attempt is no longer active"); error.name = "AbortError"; throw error; }
        };
        checkActive();
        let intent = await io.read(input.owner, input.captureId);
        if (intent === null) {
          await io.write({ ...input, version: 1, phase: "prepared", jobId: null,
            storagePath: `${input.owner}/ocr/${input.captureId}.${input.extension}` });
          intent = await io.read(input.owner, input.captureId);
        }
        intent = canonical(intent, input);
        if (intent.phase === "prepared") {
          checkActive();
          await effects.upload(intent);
          await io.write({ ...intent, phase: "submitted" });
          intent = canonical(await io.read(input.owner, input.captureId), input);
          if (intent.phase !== "submitted") throw new Error("OCR submission marker was not persisted");
        }
        // A submitted POST may already have committed. Retry the same request
        // before considering any new upload, including after job expiry.
        checkActive();
        const job = intent.jobId ? await effects.get(intent) : await effects.create(intent);
        if (!job.id || job.storagePath !== intent.storagePath || intent.jobId !== null && intent.jobId !== job.id) {
          throw new Error("OCR job identity mismatch");
        }
        if (intent.jobId === null) {
          await io.write({ ...intent, jobId: job.id });
          const persisted = canonical(await io.read(input.owner, input.captureId), input);
          if (persisted.jobId !== job.id) throw new Error("OCR job acknowledgement was not persisted");
        }
        return job;
      });
      pending.set(key, operation);
      void operation.finally(() => { if (pending.get(key) === operation) pending.delete(key); }).catch(() => undefined);
      return operation;
    },
  };
}
