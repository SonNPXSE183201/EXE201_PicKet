import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

Map<String, dynamic> transaction({bool archived = true}) => {
  'id': 'transaction-id',
  'wallet_id': 'wallet-id',
  'title': 'Retry archive',
  'amount': 1000,
  'kind': 'expense',
  'occurred_at': '2026-10-20T00:00:00Z',
  'note': '',
  'row_version': 2,
  'created_at': '2026-10-20T00:00:00Z',
  'updated_at': '2026-10-20T01:00:00Z',
  'deleted_at': archived ? '2026-10-20T01:00:00Z' : null,
};

void main() {
  for (final scenario in ['archived', 'active', 'hidden', 'read-error']) {
    test('archive retry handles $scenario without another mutation', () async {
      var writes = 0;
      var reads = 0;
      final gateway = SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://project.supabase.co'),
          supabasePublishableKey: 'publishable-key',
        ),
        client: MockClient((request) async {
          expect(request.headers['authorization'], 'Bearer user-jwt');
          expect(request.headers['apikey'], 'publishable-key');
          if (request.url.path == '/auth/v1/user') {
            return http.Response(jsonEncode({'id': 'owner-id'}), 200);
          }
          expect(request.url.path, '/rest/v1/transactions');
          expect(request.url.queryParameters['id'], 'eq.transaction-id');
          if (request.method == 'PATCH') {
            writes++;
            expect(request.url.queryParameters['row_version'], 'eq.1');
            expect(request.url.queryParameters['deleted_at'], 'is.null');
            return http.Response('[]', 200);
          }
          expect(request.method, 'GET');
          reads++;
          expect(
            request.url.queryParameters.containsKey('row_version'),
            isFalse,
          );
          expect(
            request.url.queryParameters.containsKey('deleted_at'),
            isFalse,
          );
          if (scenario == 'read-error') {
            return http.Response('{"message":"unauthorized"}', 401);
          }
          return http.Response(
            jsonEncode(
              scenario == 'hidden'
                  ? []
                  : [transaction(archived: scenario == 'archived')],
            ),
            200,
          );
        }),
      );
      addTearDown(gateway.close);
      if (scenario == 'archived') {
        final result = await gateway.archiveTransaction(
          'user-jwt',
          'transaction-id',
          1,
        );
        expect(result.version, 2);
        expect(result.deletedAt, isNotNull);
      } else {
        await expectLater(
          gateway.archiveTransaction('user-jwt', 'transaction-id', 1),
          throwsA(
            isA<GatewayException>().having(
              (error) => error.statusCode,
              'status',
              scenario == 'read-error' ? 401 : 409,
            ),
          ),
        );
      }
      expect(writes, 1);
      expect(reads, 1);
    });
  }
}
