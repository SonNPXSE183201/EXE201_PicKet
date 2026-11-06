import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/gemini_learning.dart';
import 'package:picket_api/src/learning_worker.dart';
import 'package:picket_api/src/learning_worker_gateway.dart';

Future<void> main(List<String> arguments) async {
  final once = arguments.contains('--once');
  final client = http.Client();
  try {
    final config = LearningWorkerConfig.fromEnvironment();
    final provider = GeminiLearningAdapter(
      apiKey: config.geminiKey,
      model: config.model,
      client: client,
    );
    final gateway = SupabaseLearningJobGateway(config, client);
    final worker = LearningWorker(
      gateway: gateway,
      explain: provider.explain,
    );
    var nextPrune = DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);
    do {
      try {
        final now = DateTime.now().toUtc();
        if (!now.isBefore(nextPrune)) {
          await gateway.prune();
          nextPrune = now.add(const Duration(hours: 1));
        }
        await worker.runOnce();
      } on Object {
        // Never log keys, owner IDs, job bodies or provider responses.
        stderr.writeln('Learning worker cycle unavailable.');
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
