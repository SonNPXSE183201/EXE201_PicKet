import 'package:picket_api/src/import_contract.dart';
import 'package:test/test.dart';

Map<String, dynamic> validExport() => {
  'format': 'picket-export-v1',
  'schemaVersion': 1,
  'exportedAt': '2026-10-09T12:00:00.000Z',
  'revision': 10,
  'data': {
    'version': 2,
    'name': 'An',
    'onboarded': true,
    'hideBalance': false,
    'wallets': [
      {
        'id': '11111111-1111-4111-8111-111111111111',
        'name': 'Ví',
        'openingBalance': 0,
      },
    ],
    'entries': <Object?>[],
    'budgets': <Object?>[],
    'bills': <Object?>[],
    'keepsakes': <Object?>[],
    'subscriptions': <Object?>[],
    'closedMonths': <Object?>[],
    'customCategories': <Object?>[],
    'preferences': <String, dynamic>{},
  },
};

void main() {
  test('wallet backup currency must be an uppercase currency code', () {
    final value = validExport();
    final data = value['data'] as Map<String, dynamic>;
    final wallet = (data['wallets'] as List).first as Map<String, dynamic>;
    wallet['currencyCode'] = 'usd';
    expect(() => FinanceImportEnvelope.fromJson(value), throwsFormatException);
    wallet['currencyCode'] = 'USD';
    expect(FinanceImportEnvelope.fromJson(value).summary.wallets, 1);
  });
  test('a transfer entry keeps the legacy category label and validates', () {
    final value = validExport();
    final data = value['data'] as Map<String, dynamic>;
    (data['wallets'] as List).add({
      'id': '22222222-2222-4222-8222-222222222222',
      'name': 'Bank',
      'openingBalance': 0,
    });
    data['entries'] = [
      {
        'id': '33333333-3333-4333-8333-333333333333',
        'title': 'Rút tiền',
        'amount': 200000,
        'type': 'transfer',
        'walletId': '11111111-1111-4111-8111-111111111111',
        'destinationId': '22222222-2222-4222-8222-222222222222',
        'category': 'Khác',
        'date': '2026-10-01T08:00:00.000Z',
        'parts': <Object?>[],
        'reconciledWalletIds': <Object?>[],
      },
    ];
    expect(FinanceImportEnvelope.fromJson(value).summary.entries, 1);
  });
  test('categories with ids are optional and validated when present', () {
    final value = validExport();
    final data = value['data'] as Map<String, dynamic>;
    expect(FinanceImportEnvelope.fromJson(value).summary.wallets, 1);
    data['categories'] = [
      {
        'id': '44444444-4444-4444-8444-444444444444',
        'name': 'Cà phê',
        'kind': 'expense',
        'color': null,
        'icon': 'coffee',
        'isCustom': true,
      },
    ];
    expect(FinanceImportEnvelope.fromJson(value).summary.wallets, 1);
    for (final bad in [
      {'id': 'not-a-uuid', 'name': 'X', 'kind': 'expense'},
      {
        'id': '44444444-4444-4444-8444-444444444444',
        'name': '',
        'kind': 'expense',
      },
      {
        'id': '44444444-4444-4444-8444-444444444444',
        'name': 'X',
        'kind': 'transfer',
      },
      {
        'id': '44444444-4444-4444-8444-444444444444',
        'name': 'X',
        'kind': 'both',
        'color': 'red',
      },
    ]) {
      data['categories'] = [bad];
      expect(
        () => FinanceImportEnvelope.fromJson(value),
        throwsFormatException,
      );
    }
    data['categories'] = 'nope';
    expect(() => FinanceImportEnvelope.fromJson(value), throwsFormatException);
  });
  test('appearance restore rejects invalid fields before any write', () {
    for (final preferences in [
      {'themeMode': 'neon'},
      {'languageMode': '../en'},
      {'colorSchemeId': true},
      {'themeMode': 42},
    ]) {
      final value = validExport();
      (value['data'] as Map<String, dynamic>)['preferences'] = preferences;
      expect(
        () => FinanceImportEnvelope.fromJson(value),
        throwsFormatException,
      );
    }
  });
  test('appearance restore keeps nullable and future-compatible defaults', () {
    final value = validExport();
    (value['data'] as Map<String, dynamic>)['preferences'] = {
      'themeMode': null,
      'languageMode': 'fr',
      'colorSchemeId': 'forest',
    };
    final result = FinanceImportEnvelope.fromJson(value);
    expect((result.data['preferences'] as Map)['languageMode'], 'fr');
  });
  test('validates export without mutating data', () {
    final result = FinanceImportEnvelope.fromJson(validExport());
    expect(result.summary.toJson()['wallets'], 1);
  });
  test('restore requires exact confirmation and current revision', () {
    expect(
      () => RestoreFinanceRequest.fromJson({
        'expectedRevision': 10,
        'confirmation': 'restore',
        'export': validExport(),
      }),
      throwsFormatException,
    );
    final result = RestoreFinanceRequest.fromJson({
      'expectedRevision': 10,
      'confirmation': 'RESTORE',
      'export': validExport(),
    });
    expect(result.snapshot.expectedRevision, 10);
  });
  test('rejects invalid references and split totals', () {
    final value = validExport();
    (value['data'] as Map<String, dynamic>)['entries'] = [
      {
        'id': '22222222-2222-4222-8222-222222222222',
        'title': 'Chi',
        'amount': 100,
        'type': 'expense',
        'walletId': '33333333-3333-4333-8333-333333333333',
        'category': 'Ăn uống',
        'date': '2026-10-09T12:00:00Z',
        'destinationId': null,
        'refundOf': null,
        'parts': <Object?>[],
        'reconciledWalletIds': <Object?>[],
      },
    ];
    expect(() => FinanceImportEnvelope.fromJson(value), throwsFormatException);
  });
}
