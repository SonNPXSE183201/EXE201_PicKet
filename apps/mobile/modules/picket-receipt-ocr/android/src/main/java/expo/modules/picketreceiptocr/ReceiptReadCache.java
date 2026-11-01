package expo.modules.picketreceiptocr;
import java.util.HashMap;
import java.util.Map;

/** Session-scoped full-source OCR only. Never stores images or survives a scan. */
final class ReceiptReadCache {
  private Map<String,Object> sourceRead;
  void remember(Map<String,Object> result) { sourceRead=new HashMap<>(result); }
  Map<String,Object> read() {
    if(sourceRead==null)return null;
    Map<String,Object> result=new HashMap<>(sourceRead);
    result.put("durationMs",0L);result.put("reused",true);return result;
  }
  void invalidate() { sourceRead=null; }
}
