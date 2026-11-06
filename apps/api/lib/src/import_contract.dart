import 'package:picket_api/src/finance_contract.dart';

const _maxMoney = 9000000000000;
final _uuid = RegExp(
  r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  caseSensitive: false,
);

class FinanceImportEnvelope {
  const FinanceImportEnvelope({required this.revision, required this.data});

  factory FinanceImportEnvelope.fromJson(Object? value) {
    final json = _object(value, 'Invalid export file.');
    const keys = {'format', 'schemaVersion', 'exportedAt', 'revision', 'data'};
    if (json.keys.toSet().difference(keys).isNotEmpty ||
        keys.difference(json.keys.toSet()).isNotEmpty ||
        json['format'] != 'picket-export-v1' ||
        json['schemaVersion'] != 1 ||
        json['revision'] is! int ||
        (json['revision'] as int) < 0 ||
        DateTime.tryParse(json['exportedAt'] as String? ?? '') == null) {
      throw const FormatException('Invalid export metadata.');
    }
    final data = _object(json['data'], 'Invalid finance payload.');
    _validatePayload(data);
    return FinanceImportEnvelope(revision: json['revision'] as int, data: data);
  }

  final int revision;
  final Map<String, dynamic> data;

  FinanceImportSummary get summary => FinanceImportSummary(
    wallets: (data['wallets'] as List).length,
    entries: (data['entries'] as List).length,
    budgets: (data['budgets'] as List).length,
    bills: (data['bills'] as List).length,
    keepsakes: (data['keepsakes'] as List).length,
    subscriptions: (data['subscriptions'] as List).length,
  );
}

class RestoreFinanceRequest {
  const RestoreFinanceRequest({
    required this.expectedRevision,
    required this.export,
  });

  factory RestoreFinanceRequest.fromJson(Object? value) {
    final json = _object(value, 'Invalid restore request.');
    if (json.keys.toSet().difference({
          'expectedRevision',
          'confirmation',
          'export',
        }).isNotEmpty ||
        json['expectedRevision'] is! int ||
        (json['expectedRevision'] as int) < 0 ||
        json['confirmation'] != 'RESTORE') {
      throw const FormatException(
        'Restore confirmation and revision are required.',
      );
    }
    return RestoreFinanceRequest(
      expectedRevision: json['expectedRevision'] as int,
      export: FinanceImportEnvelope.fromJson(json['export']),
    );
  }

  final int expectedRevision;
  final FinanceImportEnvelope export;

  SaveSnapshotRequest get snapshot => SaveSnapshotRequest(
    expectedRevision: expectedRevision,
    payload: export.data,
  );
}

class FinanceImportSummary {
  const FinanceImportSummary({
    required this.wallets,
    required this.entries,
    required this.budgets,
    required this.bills,
    required this.keepsakes,
    required this.subscriptions,
  });
  final int wallets;
  final int entries;
  final int budgets;
  final int bills;
  final int keepsakes;
  final int subscriptions;
  Map<String, dynamic> toJson() => {
    'valid': true,
    'wallets': wallets,
    'entries': entries,
    'budgets': budgets,
    'bills': bills,
    'keepsakes': keepsakes,
    'subscriptions': subscriptions,
  };
}

void _validatePayload(Map<String, dynamic> data) {
  const arrayLimits = {
    'wallets': 1000,
    'entries': 100000,
    'budgets': 10000,
    'bills': 10000,
    'keepsakes': 10000,
    'subscriptions': 10000,
    'closedMonths': 1200,
    'customCategories': 1000,
  };
  if (data['version'] != 2 ||
      !_text(data['name'], 120) ||
      data['onboarded'] is! bool ||
      data['hideBalance'] is! bool ||
      data['preferences'] is! Map) {
    throw const FormatException('Invalid finance payload.');
  }
  final preferences = data['preferences'] as Map;
  final theme = preferences['themeMode'];
  final language = preferences['languageMode'];
  final scheme = preferences['colorSchemeId'];
  if ((theme != null && !{'system', 'light', 'dark'}.contains(theme)) ||
      (language != null &&
          (language is! String ||
              (language != 'system' &&
                  !RegExp(r'^[a-z]{2,3}(-[A-Z]{2})?$').hasMatch(language)))) ||
      (scheme != null &&
          (scheme is! String ||
              !RegExp(r'^[a-z][a-z0-9_-]{0,63}$').hasMatch(scheme)))) {
    throw const FormatException('Invalid backup appearance preference.');
  }
  for (final limit in arrayLimits.entries) {
    final value = data[limit.key];
    if (value is! List || value.length > limit.value) {
      throw FormatException('Invalid ${limit.key}.');
    }
  }
  if (!(data['customCategories'] as List).every((item) => _text(item, 80))) {
    throw const FormatException('Invalid custom categories.');
  }

  final walletIds = <String>{};
  for (final value in data['wallets'] as List) {
    final item = _object(value, 'Invalid wallet.');
    final id = item['id'];
    final currency = item['currencyCode'];
    if (item.containsKey('currencyCode') &&
        (currency is! String || !RegExp(r'^[A-Z]{3}$').hasMatch(currency))) {
      throw const FormatException('Invalid wallet currency.');
    }
    if (!_validUuid(id) ||
        !walletIds.add(id as String) ||
        !_text(item['name'], 80) ||
        !_money(item['openingBalance'], allowNegative: true)) {
      throw const FormatException('Invalid wallet.');
    }
  }
  final entryIds = <String>{};
  for (final value in data['entries'] as List) {
    final item = _object(value, 'Invalid transaction.');
    final id = item['id'];
    final type = item['type'];
    final walletId = item['walletId'];
    final destinationId = item['destinationId'];
    final refundOf = item['refundOf'];
    if (!_validUuid(id) ||
        !entryIds.add(id as String) ||
        !_text(item['title'], 160) ||
        !_money(item['amount']) ||
        !{'expense', 'income', 'transfer'}.contains(type) ||
        !walletIds.contains(walletId) ||
        !_text(item['category'], 80) ||
        DateTime.tryParse(item['date'] as String? ?? '') == null) {
      throw const FormatException('Invalid transaction.');
    }
    if (type == 'transfer'
        ? !walletIds.contains(destinationId) || destinationId == walletId
        : destinationId != null) {
      throw const FormatException('Invalid transfer.');
    }
    if (refundOf != null && !_validUuid(refundOf)) {
      throw const FormatException('Invalid refund link.');
    }
    final parts = item['parts'];
    final reconciled = item['reconciledWalletIds'];
    if (parts is! List ||
        parts.length > 20 ||
        reconciled is! List ||
        !reconciled.every(walletIds.contains)) {
      throw const FormatException('Invalid transaction allocation.');
    }
    var total = 0;
    final categories = <String>{};
    for (final value in parts) {
      final part = _object(value, 'Invalid transaction allocation.');
      if (!_text(part['category'], 80) ||
          !categories.add(part['category'] as String) ||
          !_money(part['amount'])) {
        throw const FormatException('Invalid transaction allocation.');
      }
      total += part['amount'] as int;
    }
    if (parts.isNotEmpty && total != item['amount']) {
      throw const FormatException(
        'Transaction allocation total does not match.',
      );
    }
  }
  for (final name in ['budgets', 'bills', 'keepsakes', 'subscriptions']) {
    final ids = <String>{};
    for (final value in data[name] as List) {
      final item = _object(value, 'Invalid $name item.');
      if (!_validUuid(item['id']) || !ids.add(item['id'] as String)) {
        throw FormatException('Invalid $name item.');
      }
    }
  }
}

Map<String, dynamic> _object(Object? value, String message) {
  if (value is! Map) throw FormatException(message);
  return Map<String, dynamic>.from(value);
}

bool _text(Object? value, int max) =>
    value is String && value.trim().isNotEmpty && value.trim().length <= max;
bool _validUuid(Object? value) => value is String && _uuid.hasMatch(value);
bool _money(Object? value, {bool allowNegative = false}) =>
    value is int && value.abs() <= _maxMoney && (allowNegative || value > 0);
