import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/gemini_learning.dart';

Future<void> main() async {
  final client = http.Client();
  try {
    final adapter = GeminiLearningAdapter(
      apiKey: Platform.environment['GEMINI_API_KEY'] ?? '',
      model: Platform.environment['GEMINI_MODEL'] ?? '',
      client: client,
    );
    for (final locale in ['vi', 'en']) {
      final ids = await adapter.explain('cash-gap-v1', locale);
      stdout.writeln(
        'Synthetic smoke $locale: PASS (${ids.length} approved IDs)',
      );
    }
  } on LearningProviderUnavailable catch (error) {
    stderr.writeln(
      'Synthetic smoke unavailable: '
      '${error.kind.name}, HTTP ${error.statusCode ?? "not available"}. '
      'No retry.',
    );
    exitCode = 1;
  } on Object {
    stderr.writeln(
      'Synthetic smoke failed; no retry or alternate provider started.',
    );
    exitCode = 1;
  } finally {
    client.close();
  }
}
