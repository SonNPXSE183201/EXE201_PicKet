import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/billing_contract.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  test(
    'forwards only the authenticated purchase contract to verifier',
    () async {
      var requestCount = 0;
      final client = MockClient((request) async {
        requestCount += 1;
        expect(request.headers['authorization'], 'Bearer user-jwt');
        expect(request.headers['apikey'], 'sb_publishable_test_key');
        if (request.url.path == '/auth/v1/user') {
          return http.Response(jsonEncode({'id': 'user-id'}), 200);
        }
        expect(request.url.path, '/functions/v1/verify-purchase');
        expect(jsonDecode(request.body), {
          'productId': 'picket_pro_monthly',
          'purchaseToken': 'play-token',
        });
        return http.Response(
          jsonEncode({
            'verified': true,
            'active': true,
            'tier': 'pro',
            'expiresAt': '2026-11-13T00:00:00.000Z',
          }),
          200,
        );
      });
      final gateway = SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://project.supabase.co'),
          supabasePublishableKey: 'sb_publishable_test_key',
        ),
        client: client,
      );

      final result = await gateway.verifyPlayPurchase(
        'user-jwt',
        const VerifyPlayPurchaseRequest(
          productId: 'picket_pro_monthly',
          purchaseToken: 'play-token',
        ),
      );

      expect(requestCount, 2);
      expect(result.tier, 'pro');
      gateway.close();
    },
  );

  test('rejects a malformed verifier response as a bad gateway', () async {
    final client = MockClient((request) async {
      if (request.url.path == '/auth/v1/user') {
        return http.Response(jsonEncode({'id': 'user-id'}), 200);
      }
      return http.Response(jsonEncode({'verified': true}), 200);
    });
    final gateway = SupabaseGateway(
      ApiConfig(
        supabaseUrl: Uri.parse('https://project.supabase.co'),
        supabasePublishableKey: 'sb_publishable_test_key',
      ),
      client: client,
    );

    await expectLater(
      gateway.verifyPlayPurchase(
        'user-jwt',
        const VerifyPlayPurchaseRequest(
          productId: 'picket_plus_yearly',
          purchaseToken: 'play-token',
        ),
      ),
      throwsA(
        isA<GatewayException>().having(
          (error) => error.statusCode,
          'statusCode',
          502,
        ),
      ),
    );
    gateway.close();
  });

  SupabaseGateway gatewayAnswering(int status, Object body) => SupabaseGateway(
    ApiConfig(
      supabaseUrl: Uri.parse('https://project.supabase.co'),
      supabasePublishableKey: 'sb_publishable_test_key',
    ),
    client: MockClient((request) async {
      if (request.url.path == '/auth/v1/user') {
        return http.Response(jsonEncode({'id': 'user-id'}), 200);
      }
      return http.Response(jsonEncode(body), status);
    }),
  );

  Matcher gatewayStatus(int status) => throwsA(
    isA<GatewayException>().having((e) => e.statusCode, 'statusCode', status),
  );

  test(
    'an invalid or forged Google token is a 422, not a gateway error',
    () async {
      final gateway = gatewayAnswering(422, {
        'error': 'Purchase could not be verified',
      });
      await expectLater(
        gateway.verifyPlayPurchase(
          'user-jwt',
          const VerifyPlayPurchaseRequest(
            productId: 'picket_plus_monthly',
            purchaseToken: 'fake',
          ),
        ),
        gatewayStatus(422),
      );
      gateway.close();
    },
  );

  test(
    'a Google Play outage is reported as 503 so clients can retry',
    () async {
      final gateway = gatewayAnswering(503, {
        'error': 'Unable to verify purchase',
      });
      await expectLater(
        gateway.verifyPlayPurchase(
          'user-jwt',
          const VerifyPlayPurchaseRequest(
            productId: 'picket_plus_monthly',
            purchaseToken: 'x',
          ),
        ),
        gatewayStatus(503),
      );
      gateway.close();
    },
  );

  test("reconciling another owner's wallet (P0002) is a 404", () async {
    final gateway = gatewayAnswering(400, {
      'code': 'P0002',
      'message': 'Wallet not found',
    });
    await expectLater(
      gateway.reconcileWallet('user-jwt', {
        'p_wallet_id': '11111111-1111-4111-8111-111111111111',
      }),
      gatewayStatus(404),
    );
    gateway.close();
  });
}
