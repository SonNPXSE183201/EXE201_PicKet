export type FallbackInput = {
  owner: string; captureId: string; imageRef: string; sha256: string;
  extension: string; localConfidence: number;
};
export type FallbackIntent = FallbackInput & {
  version: 1; storagePath: string; phase: "prepared" | "submitted"; jobId: string | null;
};
type JobIdentity = { id: string; storagePath: string };
export function createFallbackOutbox(io: {
  read(owner: string, captureId: string): Promise<FallbackIntent | null>;
  write(intent: FallbackIntent): Promise<void>;
}) {
  return {
    async run<J extends JobIdentity>(input: FallbackInput, effects: {
      upload(intent: FallbackIntent): Promise<void>;
      create(intent: FallbackIntent): Promise<J>;
      get(intent: FallbackIntent): Promise<J>;
    }): Promise<J> {
      void io; void input; void effects;
      throw new Error("Durable OCR fallback not implemented");
    },
  };
}
