import { parseReceiptLines, type ReceiptDraft, type ReceiptTextLine } from "./receipt-parser";

export type ReceiptOcrResult = {
  draft: ReceiptDraft;
  durationMs: number;
};

/**
 * Runs the bundled Latin recognizer only when the capture screen asks for it.
 * The lazy import keeps the rest of the app usable if a stale development APK
 * has not yet been rebuilt with the native OCR module.
 */
export async function recognizeReceipt(imageUri: string): Promise<ReceiptOcrResult> {
  const startedAt = Date.now();
  const { default: MlkitOcr } = await import("rn-mlkit-ocr");
  const result = await MlkitOcr.recognizeText(imageUri, "latin");
  const lines: ReceiptTextLine[] = result.blocks.flatMap((block) =>
    block.lines.map((line) => ({
      text: line.text,
      top: line.frame.y,
      bottom: line.frame.y + line.frame.height,
    })),
  );

  return {
    draft: parseReceiptLines(lines),
    durationMs: Date.now() - startedAt,
  };
}
