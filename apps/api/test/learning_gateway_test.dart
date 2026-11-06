import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/learning_contract.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  test(
    'authenticated learning forwards no owner or XP and validates results',
    () async {
      final gateway = SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://test.supabase.co'),
          supabasePublishableKey: 'sb_publishable_test',
        ),
        client: MockClient((request) async {
          if (request.url.path == '/auth/v1/user') {
            return http.Response('{"id":"ownerA"}', 200);
          }
          expect(request.headers['authorization'], 'Bearer token');
          expect(request.url.path, '/rest/v1/rpc/submit_learning_attempt');
          expect(jsonDecode(request.body), {
            'p_request_key': 'attempt_1',
            'p_lesson_id': 'picket.vi.financial.v1.01',
            'p_content_version': 1,
            'p_answers': [1, 1, 2],
          });
          return http.Response(
            '{"correct":3,"total":3,"awardedXp":20,"replayed":false}',
            200,
          );
        }),
      );
      final result = await gateway.submitLearningAttempt(
        'token',
        LearningAttemptRequest.fromJson({
          'lessonId': 'picket.vi.financial.v1.01',
          'contentVersion': 1,
          'answers': [1, 1, 2],
        }),
        'attempt_1',
      );
      expect(result.awardedXp, 20);
      gateway.close();
    },
  );
  test('learning progress is filtered by authenticated owner', () async {
    final gateway = SupabaseGateway(
      ApiConfig(
        supabaseUrl: Uri.parse('https://test.supabase.co'),
        supabasePublishableKey: 'sb_publishable_test',
      ),
      client: MockClient((request) async {
        if (request.url.path == '/auth/v1/user') {
          return http.Response('{"id":"ownerA"}', 200);
        }
        expect(request.url.queryParameters['user_id'], 'eq.ownerA');
        expect(request.url.queryParameters['limit'], '1000');
        return http.Response('[]', 200);
      }),
    );
    expect(await gateway.listLearningProgress('token'), isEmpty);
    gateway.close();
  });
}
