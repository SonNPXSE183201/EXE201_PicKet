import 'package:picket_api/src/resource_validation.dart';

export 'package:picket_api/src/resource_validation.dart' show validateUuid;

class AccountResource {
  const AccountResource({
    required this.id,
    required this.name,
    required this.kind,
    required this.currencyCode,
    required this.openingBalance,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.archivedAt,
  });

  factory AccountResource.fromDatabase(Map<String, dynamic> row) =>
      AccountResource(
        id: row['id'] as String,
        name: row['name'] as String,
        kind: row['kind'] as String,
        currencyCode: row['currency_code'] as String,
        openingBalance: row['opening_balance'] as int,
        version: row['row_version'] as int,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
        archivedAt: row['archived_at'] == null
            ? null
            : DateTime.parse(row['archived_at'] as String),
      );

  final String id;
  final String name;
  final String kind;
  final String currencyCode;
  final int openingBalance;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'kind': kind,
    'currencyCode': currencyCode,
    'openingBalance': openingBalance,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': archivedAt?.toUtc().toIso8601String(),
    'archived': archivedAt != null,
  };
}

class CreateAccountRequest {
  const CreateAccountRequest({
    required this.name,
    required this.kind,
    required this.currencyCode,
    required this.openingBalance,
  });

  factory CreateAccountRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final name = requiredText(json['name'], 80, 'Invalid account name.');
    final kind = json['kind'];
    final currencyCode = json['currencyCode'];
    final openingBalance = json['openingBalance'];
    if (kind is! String || !accountKinds.contains(kind)) {
      throw const FormatException('Invalid account kind.');
    }
    final normalizedCurrency = validateCurrencyCode(currencyCode);
    if (openingBalance is! int || openingBalance.abs() > maxMoney) {
      throw const FormatException('Invalid opening balance.');
    }
    return CreateAccountRequest(
      name: name,
      kind: kind,
      currencyCode: normalizedCurrency,
      openingBalance: openingBalance,
    );
  }

  final String name;
  final String kind;
  final String currencyCode;
  final int openingBalance;

  Map<String, dynamic> toDatabaseJson() => {
    'name': name,
    'kind': kind,
    'currency_code': currencyCode,
    'opening_balance': openingBalance,
  };

  Map<String, dynamic> toRpcJson(String idempotencyKey) => {
    'p_idempotency_key': idempotencyKey,
    'p_name': name,
    'p_kind': kind,
    'p_currency_code': currencyCode,
    'p_opening_balance': openingBalance,
  };
}

class UpdateAccountRequest {
  const UpdateAccountRequest({
    required this.expectedVersion,
    required this.patch,
  });

  factory UpdateAccountRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final expectedVersion = json.remove('expectedVersion');
    if (expectedVersion is! int || expectedVersion < 1) {
      throw const FormatException('Invalid expected version.');
    }
    if (json.isEmpty ||
        json.keys.any(
          (key) => !{'name', 'kind', 'currencyCode'}.contains(key),
        )) {
      throw const FormatException('Invalid account update.');
    }
    final patch = <String, dynamic>{};
    if (json.containsKey('name')) {
      patch['name'] = requiredText(
        json['name'],
        80,
        'Invalid account name.',
      );
    }
    if (json.containsKey('kind')) {
      final kind = json['kind'];
      if (kind is! String || !accountKinds.contains(kind)) {
        throw const FormatException('Invalid account kind.');
      }
      patch['kind'] = kind;
    }
    if (json.containsKey('currencyCode')) {
      patch['currency_code'] = validateCurrencyCode(json['currencyCode']);
    }
    return UpdateAccountRequest(
      expectedVersion: expectedVersion,
      patch: patch,
    );
  }

  final int expectedVersion;
  final Map<String, dynamic> patch;
}

const accountKinds = {'cash', 'bank', 'ewallet', 'other'};
