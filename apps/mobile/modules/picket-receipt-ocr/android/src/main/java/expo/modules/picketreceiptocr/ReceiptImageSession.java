package expo.modules.picketreceiptocr;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.net.Uri;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import androidx.exifinterface.media.ExifInterface;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/** One decoded source and one recognizer per scan. Never writes image files. */
public final class ReceiptImageSession implements AutoCloseable {
  private static final long MAX_DECODE_PIXELS = 16_000_000L;
  private final String id = UUID.randomUUID().toString();
  private Bitmap source;
  private TextRecognizer recognizer;
  private Task<Text> pending;
  private boolean selected;
  private int selections;
  private boolean closing;
  private boolean closed;
  private final ReceiptReadCache fullSourceRead = new ReceiptReadCache();

  public static int decodeSample(int width, int height) {
    if (width <= 0 || height <= 0) throw new IllegalArgumentException("OCR_INVALID_DIMENSIONS");
    int sample = 1;
    while (((long) width / sample) * ((long) height / sample) > MAX_DECODE_PIXELS) sample *= 2;
    return sample;
  }

  public ReceiptImageSession(Context context, String path) throws Exception {
    requireWorker();
    long started = SystemClock.elapsedRealtime();
    Uri uri = Uri.parse(path);
    if (!"file".equals(uri.getScheme()) && !"content".equals(uri.getScheme())) throw new IOException("OCR_LOCAL_IMAGE_REQUIRED");
    BitmapFactory.Options bounds = new BitmapFactory.Options(); bounds.inJustDecodeBounds = true;
    try (InputStream input = context.getContentResolver().openInputStream(uri)) { BitmapFactory.decodeStream(input, null, bounds); }
    BitmapFactory.Options options = new BitmapFactory.Options(); options.inSampleSize = decodeSample(bounds.outWidth, bounds.outHeight);
    try (InputStream input = context.getContentResolver().openInputStream(uri)) { source = BitmapFactory.decodeStream(input, null, options); }
    if (source == null) throw new IOException("OCR_IMAGE_UNREADABLE");
    try {
      int orientation;
      try (InputStream input = context.getContentResolver().openInputStream(uri)) {
        orientation = new ExifInterface(input).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
      }
      Matrix matrix = new Matrix();
      switch (orientation) {
        case ExifInterface.ORIENTATION_FLIP_HORIZONTAL: matrix.setScale(-1, 1); break;
        case ExifInterface.ORIENTATION_ROTATE_180: matrix.setRotate(180); break;
        case ExifInterface.ORIENTATION_FLIP_VERTICAL: matrix.setScale(1, -1); break;
        case ExifInterface.ORIENTATION_TRANSPOSE: matrix.setRotate(90); matrix.postScale(-1, 1); break;
        case ExifInterface.ORIENTATION_ROTATE_90: matrix.setRotate(90); break;
        case ExifInterface.ORIENTATION_TRANSVERSE: matrix.setRotate(-90); matrix.postScale(-1, 1); break;
        case ExifInterface.ORIENTATION_ROTATE_270: matrix.setRotate(-90); break;
        default: break;
      }
      if (!matrix.isIdentity()) {
        Bitmap corrected = Bitmap.createBitmap(source, 0, 0, source.getWidth(), source.getHeight(), matrix, true);
        if (corrected != source) { source.recycle(); source = corrected; }
      }
      recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
      metric("decode", started, source.getWidth(), source.getHeight());
    } catch (Exception error) { source.recycle(); source = null; throw error; }
  }

  public synchronized Map<String, Object> info() {
    ensureActive(); Map<String, Object> result = dimensions(source); result.put("id", id); return result;
  }

  public synchronized Map<String, Object> select(int angle) throws Exception {
    requireWorker(); ensureActive(); validateAngle(angle);
    if (selections >= 2) throw new IOException("OCR_ALREADY_SELECTED");
    Bitmap corrected = rotate(source, angle);
    if (angle != 0) fullSourceRead.invalidate();
    if (corrected != source) { source.recycle(); source = corrected; }
    selected = true; selections++; return dimensions(source);
  }

  public synchronized Map<String, Object> direction(int timeoutMs) throws Exception {
    requireWorker(); ensureActive();
    float scale = Math.min(1f, 960f / Math.max(source.getWidth(), source.getHeight()));
    Bitmap small = Bitmap.createScaledBitmap(source, Math.max(1, Math.round(source.getWidth()*scale)), Math.max(1, Math.round(source.getHeight()*scale)), true);
    Map<String,Object> result=recognize(small, small != source, timeoutMs, "direction");
    if(small==source)fullSourceRead.remember(result);
    return result;
  }

  public synchronized Map<String, Object> inspect(int timeoutMs) throws Exception {
    requireWorker(); ensureActive();
    if(timeoutMs<=0)throw new IOException("OCR_TIMEOUT");
    Map<String,Object> cached=fullSourceRead.read();
    if(cached!=null)return cached;
    Map<String,Object> result=recognize(source, false, timeoutMs, "inspect");fullSourceRead.remember(result);return result;
  }

  public synchronized Map<String, Object> crop(int x, int y, int width, int height, int timeoutMs) throws Exception {
    requireWorker(); ensureSelected();
    if (x < 0 || y < 0 || width <= 0 || height <= 0 || (long) x + width > source.getWidth() || (long) y + height > source.getHeight()) throw new IOException("OCR_INVALID_CROP");
    Bitmap crop = Bitmap.createBitmap(source, x, y, width, height);
    int[] target = ReceiptCropScalePolicy.targetDimensions(crop.getWidth(), crop.getHeight());
    Bitmap input = crop;
    if (target[0] != crop.getWidth() || target[1] != crop.getHeight()) {
      long scaleStarted = SystemClock.elapsedRealtime();
      try {
        input = Bitmap.createScaledBitmap(crop, target[0], target[1], true);
      } catch (RuntimeException error) {
        if (!crop.isRecycled()) crop.recycle();
        throw error;
      }
      if (input != crop) crop.recycle();
      Log.i("PicketOcrPerf", "phase=crop-upscale ms=" + (SystemClock.elapsedRealtime() - scaleStarted)
          + " pixels=" + ((long) input.getWidth() * input.getHeight()));
    }
    return recognize(input, input != source, timeoutMs, "crop");
  }

  private Map<String, Object> recognize(Bitmap input, boolean owned, int timeoutMs, String phase) throws Exception {
    if (timeoutMs <= 0) { if (owned) input.recycle(); throw new IOException("OCR_TIMEOUT"); }
    final long started = SystemClock.elapsedRealtime();
    final int width = input.getWidth(), height = input.getHeight();
    Task<Text> task;
    try { task = recognizer.process(InputImage.fromBitmap(input, 0)); }
    catch (Exception error) { if (owned) input.recycle(); throw error; }
    pending = task;
    try {
      Text text = Tasks.await(task, Math.min(15_000, timeoutMs), TimeUnit.MILLISECONDS);
      List<Map<String, Object>> lines = new ArrayList<>();
      int elementCount = 0;
      for (Text.TextBlock block : text.getTextBlocks()) for (Text.Line line : block.getLines()) {
        android.graphics.Rect frame = line.getBoundingBox(); if (frame == null) continue;
        Map<String, Object> value = new HashMap<>(); value.put("text", line.getText()); value.put("angle", line.getAngle()); value.put("confidence", line.getConfidence());
        value.put("left", frame.left); value.put("right", frame.right); value.put("top", frame.top); value.put("bottom", frame.bottom); lines.add(value);
        List<Map<String, Object>> elements = new ArrayList<>();
        for (Text.Element element : line.getElements()) {
          if (elementCount >= 1600 || elements.size() >= 60) break;
          android.graphics.Rect box = element.getBoundingBox(); if (box == null) continue;
          Map<String, Object> word = new HashMap<>(); word.put("text", element.getText()); word.put("confidence", element.getConfidence());
          word.put("left", box.left); word.put("right", box.right); word.put("top", box.top); word.put("bottom", box.bottom);
          elements.add(word); elementCount++;
        }
        if (!elements.isEmpty()) value.put("elements", elements);
      }
      Map<String, Object> result = new HashMap<>(); result.put("lines", lines); result.put("width", width); result.put("height", height);
      result.put("durationMs", SystemClock.elapsedRealtime() - started); return result;
    } finally {
      metric(phase, started, width, height);
      if (task.isComplete()) { if (owned) input.recycle(); pending = null; }
      else task.addOnCompleteListener(done -> { synchronized (ReceiptImageSession.this) {
        if (owned && !input.isRecycled()) input.recycle();
        if (pending == task) pending = null;
        if (closing) release();
      }});
    }
  }

  @Override public synchronized void close() {
    closing = true;
    if (pending == null || pending.isComplete()) release();
  }
  public synchronized boolean isClosed() { return closed; }
  public String id() { return id; }
  private void release() {
    if (closed) return;
    fullSourceRead.invalidate();
    if (source != null && !source.isRecycled()) source.recycle(); source = null;
    if (recognizer != null) recognizer.close(); recognizer = null; closed = true;
  }
  private void ensureSelected() { ensureActive(); if (!selected) throw new IllegalStateException("OCR_NO_SELECTED_ANGLE"); }
  private void ensureActive() { if (closing || closed || (pending != null && !pending.isComplete())) throw new IllegalStateException("OCR_BUSY"); }
  private static void requireWorker() { if (Looper.myLooper() == Looper.getMainLooper()) throw new IllegalStateException("OCR_MAIN_THREAD"); }
  private static void validateAngle(int angle) { if (angle != 0 && angle != 90 && angle != 180 && angle != 270) throw new IllegalArgumentException("OCR_INVALID_ANGLE"); }
  private static Bitmap rotate(Bitmap bitmap, int angle) {
    if (angle == 0) return bitmap; Matrix matrix = new Matrix(); matrix.postRotate(angle);
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);
  }
  private static Map<String, Object> dimensions(Bitmap bitmap) {
    Map<String, Object> result = new HashMap<>(); result.put("width", bitmap.getWidth()); result.put("height", bitmap.getHeight()); return result;
  }
  private static void metric(String phase, long start, int width, int height) {
    Log.i("PicketOcrPerf", "phase=" + phase + " ms=" + (SystemClock.elapsedRealtime() - start) + " pixels=" + ((long) width * height));
  }
}
