import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/learning_ai_consent.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  test('consent mutation requires one explicit boolean only', () {
    expect(parseLearningAiConsent({'accepted': false}), false);
    for (final value in [
      null,
      <String, Object?>{},
      {'accepted': 'true'},
      {'accepted': true, 'owner': 'other'},
    ]) {
      expect(() => parseLearningAiConsent(value), throwsFormatException);
    }
  });
  for (final accepted in [null, true, false]) {
    test('consent uses caller JWT and validates response: $accepted', () async {
      final gateway = SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://test.supabase.co'),
          supabasePublishableKey: 'sb_publishable_test',
        ),
        client: MockClient((request) async {
          expect(request.headers['authorization'], 'Bearer user-token');
          expect(request.headers['apikey'], 'sb_publishable_test');
          if (request.url.path == '/auth/v1/user') {
            return http.Response('{"id":"owner"}', 200);
          }
          expect(
            request.url.path,
            '/rest/v1/rpc/${accepted == null ? 'load' : 'set'}_learning_ai_consent',
          );
          expect(
            jsonDecode(request.body),
            accepted == null ? <String, Object?>{} : {'p_accepted': accepted},
          );
          return http.Response(
            '{"accepted":false,"generation":2,"policyVersion":1}',
            200,
          );
        }),
      );
      expect(
        (await gateway.learningAiConsent(
          'user-token',
          accepted: accepted,
        ))['generation'],
        2,
      );
      gateway.close();
    });
  }
  test('malformed upstream consent cannot be trusted', () {
    for (final value in [
      null,
      {'accepted': true, 'generation': -1, 'policyVersion': 1},
      {'accepted': 'true', 'generation': 1, 'policyVersion': 1},
      {'accepted': true, 'generation': 1, 'policyVersion': 2},
    ]) {
      expect(() => validateLearningAiConsent(value), throwsFormatException);
    }
  });
}
