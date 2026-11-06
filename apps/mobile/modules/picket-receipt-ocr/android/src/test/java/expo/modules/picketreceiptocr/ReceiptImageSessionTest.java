package expo.modules.picketreceiptocr;
import org.junit.Test;
import static org.junit.Assert.*;
public class ReceiptImageSessionTest {
 @Test public void normalReceiptKeepsSourceDetail() { assertEquals(1,ReceiptImageSession.decodeSample(3000,4000)); }
 @Test public void oversizedSourceStaysWithinDecodePixelBudget() {
  int sample=ReceiptImageSession.decodeSample(8000,8000);
  assertTrue((8000L/sample)*(8000L/sample)<=16_000_000L);
  assertTrue((sample&(sample-1))==0);
 }
 @Test(expected=IllegalArgumentException.class) public void rejectInvalidImageBounds() {ReceiptImageSession.decodeSample(0,4000);}
}
