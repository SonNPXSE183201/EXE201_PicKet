import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/learning_ai_jobs.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

const jobId = '66666666-1234-4321-8123-123456789011';
void main() {
  test(
    'fixed case request rejects owner, personal text and arbitrary locale',
    () {
      expect(
        LearningAiRequest.fromJson({
          'scenarioId': 'cash-gap-v1',
          'locale': 'vi',
        }).locale,
        'vi',
      );
      for (final value in [
        {'scenarioId': 'cash-gap-v1', 'locale': 'vi', 'owner': 'other'},
        {'scenarioId': 'personal history', 'locale': 'vi'},
        {'scenarioId': 'cash-gap-v1', 'locale': 'fr'},
        {'scenarioId': 'cash-gap-v1'},
      ]) {
        expect(() => LearningAiRequest.fromJson(value), throwsFormatException);
      }
    },
  );
  test('status contract never exposes raw or inconsistent model output', () {
    expect(
      validateLearningAiJob({
        'id': jobId,
        'status': 'completed',
        'statementIds': ['timing'],
      })['statementIds'],
      ['timing'],
    );
    for (final value in [
      {
        'id': jobId,
        'status': 'completed',
        'statementIds': ['raw prose'],
      },
      {
        'id': jobId,
        'status': 'queued',
        'statementIds': ['timing'],
      },
      {
        'id': jobId,
        'status': 'completed',
        'statementIds': ['timing', 'timing'],
      },
      {'id': 'not-id', 'status': 'queued', 'statementIds': <String>[]},
    ]) {
      expect(() => validateLearningAiJob(value), throwsFormatException);
    }
  });
  test(
    'authenticated enqueue poll and deletion carry no claimed owner',
    () async {
      final calls = <String>[];
      final gateway = SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://test.supabase.co'),
          supabasePublishableKey: 'public-key',
        ),
        client: MockClient((request) async {
          expect(request.headers['authorization'], 'Bearer user-token');
          if (request.url.path == '/auth/v1/user') {
            return http.Response('{"id":"owner"}', 200);
          }
          calls.add(request.url.path);
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          expect(body.containsKey('owner'), false);
          if (request.url.path.endsWith('enqueue_learning_ai_job')) {
            expect(body, {
              'p_request_key': 'request_123',
              'p_scenario_id': 'cash-gap-v1',
              'p_locale': 'vi',
            });
            return http.Response('{"id":"$jobId","status":"queued"}', 200);
          }
          if (request.url.path.endsWith('delete_learning_ai_history')) {
            return http.Response('{"deleted":true}', 200);
          }
          return http.Response(
            '{"id":"$jobId","status":"completed","statementIds":["timing"]}',
            200,
          );
        }),
      );
      expect(
        (await gateway.enqueueLearningAi(
          'user-token',
          LearningAiRequest.fromJson({
            'scenarioId': 'cash-gap-v1',
            'locale': 'vi',
          }),
          'request_123',
        ))['id'],
        jobId,
      );
      expect(
        (await gateway.learningAiJob('user-token', jobId))['status'],
        'completed',
      );
      await gateway.deleteLearningAiHistory('user-token');
      expect(calls.length, 3);
      gateway.close();
    },
  );
  test(
    'generation defaults off and has no effect on revocation availability',
    () {
      expect(learningAiEnabled({}), false);
      expect(learningAiEnabled({'LEARNING_AI_ENABLED': 'true'}), true);
      expect(learningAiEnabled({'LEARNING_AI_ENABLED': 'TRUE'}), false);
    },
  );
}
