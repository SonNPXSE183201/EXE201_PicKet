package expo.modules.picketreceiptocr;

/** Bounds optional enlargement of small OCR crops without changing source pixels. */
final class ReceiptCropScalePolicy {
  private static final int TARGET_LONG_EDGE = 1200;
  private static final double MAX_SCALE = 4.0;
  private static final long MAX_PIXELS = 1_500_000L;
  private static final double MIN_USEFUL_SCALE = 1.1;

  private ReceiptCropScalePolicy() {}

  static int[] targetDimensions(int width, int height) {
    if (width <= 0 || height <= 0) return new int[] {width, height};
    int longEdge = Math.max(width, height);
    if (longEdge >= TARGET_LONG_EDGE) return new int[] {width, height};

    double scale = Math.min(MAX_SCALE, TARGET_LONG_EDGE / (double) longEdge);
    scale = Math.min(scale, Math.sqrt(MAX_PIXELS / ((long) width * height)));
    if (scale < MIN_USEFUL_SCALE) return new int[] {width, height};

    int scaledWidth = Math.max(width, (int) Math.round(width * scale));
    int scaledHeight = Math.max(height, (int) Math.round(height * scale));
    while ((long) scaledWidth * scaledHeight > MAX_PIXELS || Math.max(scaledWidth, scaledHeight) > TARGET_LONG_EDGE) {
      scaledWidth = Math.max(width, scaledWidth - 1);
      scaledHeight = Math.max(height, scaledHeight - 1);
    }
    return new int[] {scaledWidth, scaledHeight};
  }
}
