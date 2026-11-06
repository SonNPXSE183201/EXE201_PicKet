package expo.modules.picketreceiptocr;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;

public class ReceiptReadCacheTest {
  @Test public void fullSourceResultIsReusedWithoutReportingPreviousTime() throws Exception {
    Class<?> type=Class.forName("expo.modules.picketreceiptocr.ReceiptReadCache");
    Object cache=type.getDeclaredConstructor().newInstance();
    Map<String,Object> original=new HashMap<>();original.put("durationMs",55L);original.put("width",500);
    type.getDeclaredMethod("remember",Map.class).invoke(cache,original);
    @SuppressWarnings("unchecked") Map<String,Object> reused=(Map<String,Object>)type.getDeclaredMethod("read").invoke(cache);
    assertEquals(0L,reused.get("durationMs"));assertEquals(true,reused.get("reused"));assertEquals(500,reused.get("width"));
    assertEquals(55L,original.get("durationMs"));assertFalse(original.containsKey("reused"));
    type.getDeclaredMethod("invalidate").invoke(cache);
    assertNull(type.getDeclaredMethod("read").invoke(cache));
  }
}
