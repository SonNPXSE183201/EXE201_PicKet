package expo.modules.picketreceiptocr;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.test.InstrumentationTestCase;
import java.io.*;
import java.util.*;
import org.json.*;

/** Opt-in experiment only. Never changes the production image pipeline. */
public class ReceiptUpscaleExperimentTest extends InstrumentationTestCase {
  public void testSmallSourceUpscale() throws Exception {
    Context assets = getInstrumentation().getContext();
    Context target = getInstrumentation().getTargetContext();
    JSONArray rows = new JSONArray();
    String[] files = assets.getAssets().list(""); Arrays.sort(files);
    for (String name : files) {
      if (!name.toLowerCase(Locale.ROOT).matches(".*\\.(jpg|jpeg|png|webp)$")) continue;
      Bitmap source;
      try (InputStream input = assets.getAssets().open(name)) {
        source = BitmapFactory.decodeStream(input);
      }
      if (source == null) continue;
      int longest = Math.max(source.getWidth(), source.getHeight());
      if (longest > 960) { source.recycle(); continue; }
      Bitmap scaled = Bitmap.createScaledBitmap(source, source.getWidth()*2, source.getHeight()*2, true);
      File input = new File(target.getCacheDir(), "upscale-experiment.png");
      try (OutputStream stream = new FileOutputStream(input)) { scaled.compress(Bitmap.CompressFormat.PNG, 100, stream); }
      source.recycle(); scaled.recycle();
      JSONObject row = new JSONObject(); row.put("file", name);
      ReceiptImageSession session = null;
      try {
        session = new ReceiptImageSession(target, input.toURI().toString());
        session.select(0); row.put("sample", new JSONObject(session.inspect(20000)));
      } catch (Exception error) { row.put("error", error.getClass().getSimpleName()); }
      finally { if (session != null) session.close(); input.delete(); }
      rows.put(row);
      try (Writer writer = new OutputStreamWriter(new FileOutputStream(new File(target.getExternalFilesDir(null), "receipt-upscale.json")), "UTF-8")) {
        writer.write(rows.toString());
      }
    }
    assertTrue("Supply the opt-in receipt corpus", rows.length() > 0);
  }
}
