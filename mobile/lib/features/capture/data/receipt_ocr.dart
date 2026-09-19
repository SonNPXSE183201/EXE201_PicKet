import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/config/app_config.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import '../domain/receipt_parser.dart';

class ReceiptOcr {
  Future<void> recordEvent(bool success, int duration) async {
    try {
      final client = Supabase.instance.client;
      final user = client.auth.currentUser;
      if (user == null) return;
      await client
          .from('ocr_events')
          .insert({
            'user_id': user.id,
            'success': success,
            'duration_ms': duration.clamp(0, 3600000),
          })
          .timeout(const Duration(seconds: 5));
    } catch (_) {
      /* Optional aggregate telemetry does not affect local OCR. */
    }
  }

  Future<ReceiptDraft> read(String path) async {
    final recognizer = TextRecognizer(script: TextRecognitionScript.latin);
    final watch = Stopwatch()..start();
    bool success = false;
    try {
      final result = await recognizer.processImage(
        InputImage.fromFilePath(path),
      );
      success = result.text.trim().isNotEmpty;
      return parseReceipt(result.text);
    } finally {
      await recognizer.close();
      if (AppConfig.configured) {
        unawaited(recordEvent(success, watch.elapsedMilliseconds));
      }
    }
  }
}
