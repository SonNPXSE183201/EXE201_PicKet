import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/learning_worker.dart';
import 'package:picket_api/src/learning_worker_gateway.dart';
import 'package:test/test.dart';

Map<String, String> environment() => {
  'LEARNING_AI_ENABLED': 'true',
  'SUPABASE_URL': 'https://project.supabase.co',
  'SUPABASE_SECRET_KEY': 'sb_secret_abcdefghijklmnopqrstuvwxyz',
  'GEMINI_API_KEY': 'synthetic-key',
  'GEMINI_MODEL': 'gemini-test',
};

void main() {
  test('worker is opt-in and rejects client credentials or insecure URLs', () {
    for (final change in [
      {'LEARNING_AI_ENABLED': 'false'},
      {'SUPABASE_SECRET_KEY': 'sb_publishable_abcdefghijklmnopqrstuvwxyz'},
      {'SUPABASE_URL': 'http://project.supabase.co'},
      {'SUPABASE_URL': 'https://user:pass@project.supabase.co'},
      {'GEMINI_API_KEY': ''},
      {'GEMINI_MODEL': 'unrestricted-provider'},
      {'LEARNING_AI_POLL_INTERVAL_MS': '1'},
    ]) {
      expect(
        () =>
            LearningWorkerConfig.fromEnvironment({...environment(), ...change}),
        throwsA(isA<ApiConfigException>()),
      );
    }
  });
  test(
    'gateway claims only fixed cases without bearer for new secret keys',
    () async {
      final gateway = SupabaseLearningJobGateway(
        LearningWorkerConfig.fromEnvironment(environment()),
        MockClient((request) async {
          expect(request.url.path, '/rest/v1/rpc/claim_learning_ai_job');
          expect(request.headers.containsKey('authorization'), false);
          expect(
            request.headers['apikey'],
            environment()['SUPABASE_SECRET_KEY'],
          );
          return http.Response(
            jsonEncode({
              'id': '66666666-1234-4321-8123-123456789011',
              'leaseToken': '66666666-1234-4321-8123-123456789012',
              'scenarioId': 'cash-gap-v1',
              'locale': 'en',
            }),
            200,
          );
        }),
      );
      expect((await gateway.claim())?.locale, 'en');
    },
  );
  test('legacy service JWT uses bearer and empty queue is null', () async {
    final jwt =
        'e30.${base64Url.encode(utf8.encode('{"role":"service_role"}'))}.sig';
    final gateway = SupabaseLearningJobGateway(
      LearningWorkerConfig.fromEnvironment({
        ...environment(),
        'SUPABASE_SECRET_KEY': jwt,
      }),
      MockClient((request) async {
        expect(request.headers['authorization'], 'Bearer $jwt');
        return http.Response('null', 200);
      }),
    );
    expect(await gateway.claim(), isNull);
  });
  test(
    'dispatch and completion use lease and never transmit owner or raw text',
    () async {
      final bodies = <Object?>[];
      final paths = <String>[];
      final gateway = SupabaseLearningJobGateway(
        LearningWorkerConfig.fromEnvironment(environment()),
        MockClient((request) async {
          paths.add(request.url.path);
          bodies.add(jsonDecode(request.body));
          return http.Response('true', 200);
        }),
      );
      const job = LearningJob('job', 'lease', 'cash-gap-v1', 'vi');
      expect(await gateway.markDispatched(job), true);
      await gateway.complete(job, ['timing']);
      await gateway.fail(job);
      expect(paths, [
        '/rest/v1/rpc/dispatch_learning_ai_job',
        '/rest/v1/rpc/finish_learning_ai_job',
        '/rest/v1/rpc/finish_learning_ai_job',
      ]);
      expect(bodies, [
        {'p_id': 'job', 'p_lease_token': 'lease'},
        {
          'p_id': 'job',
          'p_lease_token': 'lease',
          'p_statement_ids': ['timing'],
        },
        {'p_id': 'job', 'p_lease_token': 'lease', 'p_statement_ids': null},
      ]);
    },
  );
  for (final response in ['{"private":"text"}', '[]', 'false', 'not JSON']) {
    test('malformed claim fails closed: $response', () async {
      final gateway = SupabaseLearningJobGateway(
        LearningWorkerConfig.fromEnvironment(environment()),
        MockClient((_) async => http.Response(response, 200)),
      );
      expect(gateway.claim, throwsA(isA<LearningWorkerGatewayException>()));
    });
  }
  test('upstream body never appears in gateway errors', () async {
    final gateway = SupabaseLearningJobGateway(
      LearningWorkerConfig.fromEnvironment(environment()),
      MockClient((_) async => http.Response('private-upstream-body', 503)),
    );
    try {
      await gateway.claim();
      fail('upstream failure expected');
    } on LearningWorkerGatewayException catch (error) {
      expect(error.toString(), isNot(contains('private-upstream-body')));
    }
  });
}
