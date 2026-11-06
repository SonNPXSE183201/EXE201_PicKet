import 'dart:async';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/ocr_worker.dart';
import 'package:picket_api/src/ocr_worker_config.dart';

Future<void> main(List<String> arguments) async {
  final once = arguments.contains('--once');
  final client = http.Client();
  try {
    final config = OcrWorkerConfig.fromEnvironment();
    final worker = OcrWorker(
      OcrWorkerGateway(config, client),
      PpOcrProvider(config, client),
    );
    do {
      try {
        final count = await worker.runOnce();
        stdout.writeln('OCR worker processed $count job(s).');
      } on OcrWorkerException catch (error) {
        stderr.writeln('OCR worker cycle failed: ${error.code}.');
        if (once) exitCode = 1;
      } on Object {
        stderr.writeln('OCR worker cycle failed unexpectedly.');
        if (once) exitCode = 1;
      }
      if (!once) await Future<void>.delayed(config.pollInterval);
    } while (!once);
  } on ApiConfigException catch (error) {
    stderr.writeln(error.message);
    exitCode = 64;
  } finally {
    client.close();
  }
}
