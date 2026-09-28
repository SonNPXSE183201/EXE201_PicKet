import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/config/app_config.dart';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import '../domain/receipt_parser.dart';

class ReceiptOcr {
  ReceiptOcr({TextRecognizer? recognizer})
    : _recognizer =
          recognizer ?? TextRecognizer(script: TextRecognitionScript.latin);

  final TextRecognizer _recognizer;
  bool _closed = false;
  bool _reading = false;
  Completer<void>? _idle;
  Future<void>? _closeFuture;

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
    if (_closed) throw StateError('OCR recognizer has been closed');
    if (_reading) throw StateError('OCR is already processing an image');
    _reading = true;
    final idle = Completer<void>();
    _idle = idle;
    final watch = Stopwatch()..start();
    bool success = false;
    try {
      final result = await _recognizer.processImage(
        InputImage.fromFilePath(path),
      );
      success = result.text.trim().isNotEmpty;
      final lines = [
        for (final block in result.blocks)
          for (final line in block.lines)
            ReceiptTextLine(
              text: line.text,
              confidence: line.confidence,
              left: line.boundingBox.left,
              top: line.boundingBox.top,
              right: line.boundingBox.right,
              bottom: line.boundingBox.bottom,
            ),
      ];
      return parseReceiptLines(lines, rawText: result.text);
    } finally {
      _reading = false;
      idle.complete();
      if (AppConfig.configured) {
        unawaited(recordEvent(success, watch.elapsedMilliseconds));
      }
    }
  }

  Future<void> close() => _closeFuture ??= _close();

  Future<void> _close() async {
    _closed = true;
    final idle = _idle;
    if (idle != null && !idle.isCompleted) await idle.future;
    await _recognizer.close();
  }
}
