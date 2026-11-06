import type { ImagePickerOptions } from "expo-image-picker";

// Receipts are commonly much taller than the editor's fixed crop ratio. Keep
// the complete frame so merchant headers and payable totals reach OCR intact.
export const receiptImagePickerOptions = {
  mediaTypes: ["images"],
  allowsEditing: false,
  // Android's picker copies the source at quality 1 instead of recompressing it.
  // Small VAT labels and dates must reach the native recognizer intact.
  quality: 1,
  exif: false,
} satisfies ImagePickerOptions;
