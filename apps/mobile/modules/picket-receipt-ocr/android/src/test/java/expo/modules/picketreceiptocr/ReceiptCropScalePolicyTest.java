package expo.modules.picketreceiptocr;

import org.junit.Test;
import static org.junit.Assert.*;

public class ReceiptCropScalePolicyTest {
  @Test public void enlargesSmallCropsWithoutExceedingTargetEdge() {
    int[] size = ReceiptCropScalePolicy.targetDimensions(240, 90);
    assertTrue(size[0] > 240);
    assertTrue(size[1] > 90);
    assertTrue(Math.max(size[0], size[1]) <= 1200);
  }

  @Test public void leavesAlreadyLargeCropsAtNativeResolution() {
    int[] size = ReceiptCropScalePolicy.targetDimensions(1600, 900);
    assertArrayEquals(new int[] {1600, 900}, size);
  }

  @Test public void keepsUpscaledCropWithinPixelBudget() {
    int[] size = ReceiptCropScalePolicy.targetDimensions(900, 700);
    assertTrue((long) size[0] * size[1] <= 4_000_000L);
  }

  @Test public void invalidDimensionsAreNotUpscaled() {
    assertArrayEquals(new int[] {0, 20}, ReceiptCropScalePolicy.targetDimensions(0, 20));
  }
}
