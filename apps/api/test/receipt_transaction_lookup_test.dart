import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  SupabaseGateway gatewayRecording(List<Uri> requests) => SupabaseGateway(
    ApiConfig(
      supabaseUrl: Uri.parse('https://project.supabase.co'),
      supabasePublishableKey: 'sb_publishable_test_key',
    ),
    client: MockClient((request) async {
      if (request.url.path == '/auth/v1/user') {
        return http.Response(jsonEncode({'id': 'user-id'}), 200);
      }
      requests.add(request.url);
      return http.Response('[]', 200);
    }),
  );

  test('the receipt of one transaction is looked up directly', () async {
    final requests = <Uri>[];
    final gateway = gatewayRecording(requests);
    await gateway.listReceipts(
      'user-jwt',
      transactionId: '11111111-1111-4111-8111-111111111111',
    );
    expect(
      requests.single.queryParameters['transaction_id'],
      'eq.11111111-1111-4111-8111-111111111111',
    );
    expect(requests.single.queryParameters['archived_at'], 'is.null');
    gateway.close();
  });

  test('the full list keeps its previous query', () async {
    final requests = <Uri>[];
    final gateway = gatewayRecording(requests);
    await gateway.listReceipts('user-jwt');
    expect(
      requests.single.queryParameters.containsKey('transaction_id'),
      false,
    );
    expect(requests.single.queryParameters['limit'], '50');
    gateway.close();
  });

  test('a malformed transaction id never reaches the database', () async {
    final requests = <Uri>[];
    final gateway = gatewayRecording(requests);
    await expectLater(
      gateway.listReceipts('user-jwt', transactionId: 'abc,id.neq.0'),
      throwsFormatException,
    );
    expect(requests, isEmpty);
    gateway.close();
  });
}
