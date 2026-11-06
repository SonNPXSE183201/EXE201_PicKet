// Local acceptance only: real Supabase RPCs with a deterministic fake provider.
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/gemini_learning.dart';
import 'package:picket_api/src/learning_worker.dart';
import 'package:picket_api/src/learning_worker_gateway.dart';

Future<void> main() async {
  final config = LearningWorkerConfig.fromEnvironment();
  if (config.supabaseUrl.host != '127.0.0.1' ||
      config.supabaseUrl.port != 54321) {
    throw StateError(
      'Local acceptance cannot access a remote Supabase project.',
    );
  }
  final real = http.Client();
  var calls = 0;
  final client = MockClient((request) async {
    if (request.url.host == 'generativelanguage.googleapis.com') {
      calls++;
      if (request.body.contains('@example.test') ||
          request.body.contains('owner_id')) {
        throw StateError('Personal context reached provider');
      }
      return http.Response(
        jsonEncode({
          'candidates': [
            {
              'finishReason': 'STOP',
              'content': {
                'parts': [
                  {
                    'text': jsonEncode({
                      'statementIds': ['timing', 'buffer'],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        200,
      );
    }
    return real.post(request.url, headers: request.headers, body: request.body);
  });
  try {
    final gateway = SupabaseLearningJobGateway(config, client);
    await gateway.prune();
    final provider = GeminiLearningAdapter(
      apiKey: 'local-synthetic-key',
      model: 'gemini-test',
      client: client,
    );
    final worked = await LearningWorker(
      gateway: gateway,
      explain: provider.explain,
    ).runOnce();
    if (!worked || calls != 1) {
      throw StateError('Expected one provider invocation.');
    }
    stdout.writeln('Local worker RPC + provider boundary: PASS');
  } finally {
    client.close();
    real.close();
  }
}
