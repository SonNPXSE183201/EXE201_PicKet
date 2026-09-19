import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:mobile/features/billing/data/billing_controller.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:mobile/core/notifications/reminder_dates.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';

PurchaseDetails purchase(String token) => PurchaseDetails(
  productID: 'picket_plus_monthly',
  verificationData: PurchaseVerificationData(
    localVerificationData: '',
    serverVerificationData: token,
    source: 'google_play',
  ),
  transactionDate: '2026-09-15',
  status: PurchaseStatus.purchased,
);
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'Concurrent purchase verification stays busy until every result finishes',
    () async {
      final gates = {'one': Completer<void>(), 'two': Completer<void>()};
      final started = Completer<void>();
      var count = 0;
      final client = SupabaseClient(
        'https://example.test',
        'anon',
        httpClient: MockClient((request) async {
          if (request.url.path.contains('verify-purchase')) {
            final token = jsonDecode(request.body)['purchaseToken'] as String;
            count++;
            if (count == 2) started.complete();
            await gates[token]!.future;
            return http.Response(
              jsonEncode({'verified': true, 'active': true}),
              200,
              request: request,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            '"plus"',
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      final billing = BillingController(client);
      try {
        final first = billing.verify(purchase('one')),
            second = billing.verify(purchase('two'));
        await started.future;
        expect(billing.busy, true);
        gates['one']!.complete();
        await first;
        expect(billing.busy, true);
        gates['two']!.complete();
        await second;
        expect(billing.busy, false);
        expect(billing.tier, 'plus');
      } finally {
        billing.dispose();
        await client.dispose();
      }
    },
  );
  test('Rejected purchase verification never grants a paid tier', () async {
    final client = SupabaseClient(
      'https://example.test',
      'anon',
      httpClient: MockClient(
        (request) async => http.Response(
          '{"error":"unverified"}',
          503,
          request: request,
          headers: {'content-type': 'application/json'},
        ),
      ),
    );
    final billing = BillingController(client);
    try {
      await billing.verify(purchase('bad'));
      expect(billing.tier, 'free');
      expect(billing.busy, false);
      expect(billing.message, contains('Không cần mua lại'));
    } finally {
      billing.dispose();
      await client.dispose();
    }
  });
  test('Old reminders do not consume the future scheduling limit', () {
    final now = DateTime(2026, 9, 15, 12);
    final future = Bill(
      id: 'future',
      title: 'Upcoming',
      amount: 10,
      dueDate: DateTime(2026, 9, 20),
    );
    final data = FinanceData(
      bills: [
        for (var i = 0; i < 80; i++)
          Bill(
            id: 'old$i',
            title: 'Overdue',
            amount: 10,
            dueDate: DateTime(2020, 1, 1),
          ),
        future,
        future,
      ],
    );
    expect(reminderDates(data, now), [DateTime(2026, 9, 19, 9)]);
  });
}
