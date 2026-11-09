import { File } from "expo-file-system";
import { RECEIPT_IMAGE_QUALITY, receiptTargetSize, shouldOptimizeReceiptImage } from "./receipt-image-size";

/**
 * Writes the receipt photo kept for upload/viewing into `target`.
 * OCR has already read the full-resolution capture; the stored copy is scaled
 * to a 2000px long side so opening a receipt is fast on low-end phones.
 * Any failure falls back to an exact copy of the original.
 */
export async function copyOptimizedReceiptImage(sourceUri: string, target: File) {
  if (shouldOptimizeReceiptImage(sourceUri)) {
    try {
      const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
      const context = ImageManipulator.manipulate(sourceUri);
      try {
        const original = await context.renderAsync();
        const size = receiptTargetSize(original.width, original.height);
        if (size) {
          context.resize(size);
          const image = await context.renderAsync();
          const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: RECEIPT_IMAGE_QUALITY });
          const output = new File(saved.uri);
          try {
            await output.copy(target);
            return;
          } finally {
            if (output.exists) output.delete();
          }
        }
      } finally {
        context.release();
      }
    } catch {
      /* Keep the original photo when re-encoding is unavailable. */
    }
  }
  await new File(sourceUri).copy(target);
}
