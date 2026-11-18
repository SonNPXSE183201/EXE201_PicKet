package expo.modules.picketreceiptocr;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.SystemClock;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.File;
import java.util.*;
import java.util.concurrent.TimeUnit;

/** Test-only resolution experiment: one upright read with the long side capped. Never ships in release. */
final class ScaledRead {
 private ScaledRead() {}

 static Map<String,Object> read(File file,int longSide) throws Exception {
  Bitmap source=BitmapFactory.decodeFile(file.getAbsolutePath());
  if(source==null)throw new IllegalStateException("decode failed");
  float scale=Math.min(1f,(float)longSide/Math.max(source.getWidth(),source.getHeight()));
  Bitmap input=scale<1f?Bitmap.createScaledBitmap(source,Math.round(source.getWidth()*scale),Math.round(source.getHeight()*scale),true):source;
  TextRecognizer recognizer=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
  try{
   Tasks.await(recognizer.process(InputImage.fromBitmap(Bitmap.createBitmap(32,32,Bitmap.Config.ARGB_8888),0)),15,TimeUnit.SECONDS);
   long started=SystemClock.elapsedRealtime();
   Text text=Tasks.await(recognizer.process(InputImage.fromBitmap(input,0)),15,TimeUnit.SECONDS);
   long duration=SystemClock.elapsedRealtime()-started;
   List<Map<String,Object>> lines=new ArrayList<>();
   for(Text.TextBlock block:text.getTextBlocks())for(Text.Line line:block.getLines()){
    android.graphics.Rect frame=line.getBoundingBox();if(frame==null)continue;
    Map<String,Object> value=new HashMap<>();value.put("text",line.getText());value.put("angle",line.getAngle());value.put("confidence",line.getConfidence());
    value.put("left",frame.left);value.put("right",frame.right);value.put("top",frame.top);value.put("bottom",frame.bottom);
    List<Map<String,Object>> elements=new ArrayList<>();
    for(Text.Element element:line.getElements()){
     android.graphics.Rect box=element.getBoundingBox();if(box==null)continue;
     Map<String,Object> word=new HashMap<>();word.put("text",element.getText());word.put("confidence",element.getConfidence());
     word.put("left",box.left);word.put("right",box.right);word.put("top",box.top);word.put("bottom",box.bottom);elements.add(word);
    }
    if(!elements.isEmpty())value.put("elements",elements);
    lines.add(value);
   }
   Map<String,Object> result=new HashMap<>();result.put("lines",lines);result.put("width",input.getWidth());result.put("height",input.getHeight());result.put("durationMs",duration);
   return result;
  }finally{recognizer.close();if(input!=source)input.recycle();source.recycle();}
 }
}
