import 'package:picket_api/src/resource_validation.dart';

const subscriptionCadences = {
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
};

DateTime _subscriptionDate(Object? value) {
  if (value is! String) {
    throw const FormatException('Invalid subscription date.');
  }
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw const FormatException('Invalid subscription date.');
  return parsed.toUtc();
}

String? _optionalUuid(Object? value, String message) {
  if (value == null) return null;
  if (value is! String) throw FormatException(message);
  return validateUuid(value);
}

class SubscriptionResource {
  const SubscriptionResource({
    required this.id,
    required this.title,
    required this.amount,
    required this.cadence,
    required this.nextDueAt,
    required this.cycleMonths,
    required this.active,
    required this.note,
    required this.alertDays,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.walletId,
    this.categoryId,
    this.archivedAt,
  });
  factory SubscriptionResource.fromDatabase(Map<String, dynamic> row) =>
      SubscriptionResource(
        id: row['id'] as String,
        walletId: row['wallet_id'] as String?,
        categoryId: row['category_id'] as String?,
        title: row['title'] as String,
        amount: row['amount'] as int,
        cadence: row['cadence'] as String,
        nextDueAt: DateTime.parse(row['next_due_at'] as String),
        cycleMonths: row['cycle_months'] as int,
        active: row['active'] as bool,
        note: row['note'] as String,
        alertDays: row['alert_days'] as int,
        version: row['row_version'] as int,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
        archivedAt: row['archived_at'] == null
            ? null
            : DateTime.parse(row['archived_at'] as String),
      );
  final String id;
  final String? walletId;
  final String? categoryId;
  final String title;
  final int amount;
  final String cadence;
  final DateTime nextDueAt;
  final int cycleMonths;
  final bool active;
  final String note;
  final int alertDays;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;
  Map<String, dynamic> toJson() => {
    'id': id,
    'walletId': walletId,
    'categoryId': categoryId,
    'title': title,
    'amount': amount,
    'cadence': cadence,
    'nextDueAt': nextDueAt.toUtc().toIso8601String(),
    'cycleMonths': cycleMonths,
    'active': active,
    'note': note,
    'alertDays': alertDays,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': archivedAt?.toUtc().toIso8601String(),
  };
}

class CreateSubscriptionRequest {
  const CreateSubscriptionRequest({
    required this.title,
    required this.amount,
    required this.cadence,
    required this.nextDueAt,
    required this.cycleMonths,
    required this.note,
    required this.alertDays,
    this.walletId,
    this.categoryId,
  });
  factory CreateSubscriptionRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    const fields = {
      'walletId',
      'categoryId',
      'title',
      'amount',
      'cadence',
      'nextDueAt',
      'cycleMonths',
      'note',
      'alertDays',
    };
    if (json.keys.any((key) => !fields.contains(key))) {
      throw const FormatException('Invalid subscription fields.');
    }
    final amount = json['amount'];
    final cadence = json['cadence'];
    final cycle = json['cycleMonths'];
    final alert = json['alertDays'];
    final note = json['note'] ?? '';
    if (amount is! int ||
        amount <= 0 ||
        amount > maxMoney ||
        cadence is! String ||
        !subscriptionCadences.contains(cadence) ||
        cycle is! int ||
        cycle < 1 ||
        cycle > 120 ||
        alert is! int ||
        alert < 0 ||
        alert > 365 ||
        note is! String ||
        note.length > 2000) {
      throw const FormatException('Invalid subscription schedule.');
    }
    return CreateSubscriptionRequest(
      walletId: _optionalUuid(json['walletId'], 'Invalid subscription wallet.'),
      categoryId: _optionalUuid(
        json['categoryId'],
        'Invalid subscription category.',
      ),
      title: requiredText(json['title'], 160, 'Invalid subscription title.'),
      amount: amount,
      cadence: cadence,
      nextDueAt: _subscriptionDate(json['nextDueAt']),
      cycleMonths: cycle,
      note: note.trim(),
      alertDays: alert,
    );
  }
  final String? walletId;
  final String? categoryId;
  final String title;
  final int amount;
  final String cadence;
  final DateTime nextDueAt;
  final int cycleMonths;
  final String note;
  final int alertDays;
  Map<String, dynamic> toRpcJson(String key) => {
    'p_idempotency_key': key,
    'p_wallet_id': walletId,
    'p_category_id': categoryId,
    'p_title': title,
    'p_amount': amount,
    'p_cadence': cadence,
    'p_next_due_at': nextDueAt.toIso8601String(),
    'p_cycle_months': cycleMonths,
    'p_note': note,
    'p_alert_days': alertDays,
  };
}

class UpdateSubscriptionRequest {
  const UpdateSubscriptionRequest({
    required this.expectedVersion,
    required this.patch,
  });
  factory UpdateSubscriptionRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final version = json.remove('expectedVersion');
    const fields = {
      'walletId',
      'categoryId',
      'title',
      'amount',
      'cadence',
      'nextDueAt',
      'cycleMonths',
      'active',
      'note',
      'alertDays',
    };
    if (version is! int ||
        version < 1 ||
        json.isEmpty ||
        json.keys.any((key) => !fields.contains(key))) {
      throw const FormatException('Invalid subscription update.');
    }
    final patch = <String, dynamic>{};
    if (json.containsKey('walletId')) {
      patch['wallet_id'] = _optionalUuid(
        json['walletId'],
        'Invalid subscription wallet.',
      );
    }
    if (json.containsKey('categoryId')) {
      patch['category_id'] = _optionalUuid(
        json['categoryId'],
        'Invalid subscription category.',
      );
    }
    if (json.containsKey('title')) {
      patch['title'] = requiredText(
        json['title'],
        160,
        'Invalid subscription title.',
      );
    }
    if (json.containsKey('amount')) {
      final amount = json['amount'];
      if (amount is! int || amount <= 0 || amount > maxMoney) {
        throw const FormatException('Invalid subscription amount.');
      }
      patch['amount'] = amount;
    }
    if (json.containsKey('cadence')) {
      final cadence = json['cadence'];
      if (cadence is! String || !subscriptionCadences.contains(cadence)) {
        throw const FormatException('Invalid subscription cadence.');
      }
      patch['cadence'] = cadence;
    }
    if (json.containsKey('nextDueAt')) {
      patch['next_due_at'] = _subscriptionDate(
        json['nextDueAt'],
      ).toIso8601String();
    }
    if (json.containsKey('cycleMonths')) {
      final cycle = json['cycleMonths'];
      if (cycle is! int || cycle < 1 || cycle > 120) {
        throw const FormatException('Invalid subscription cycle.');
      }
      patch['cycle_months'] = cycle;
    }
    if (json.containsKey('active')) {
      if (json['active'] is! bool) {
        throw const FormatException('Invalid subscription active flag.');
      }
      patch['active'] = json['active'];
    }
    if (json.containsKey('note')) {
      final note = json['note'];
      if (note is! String || note.length > 2000) {
        throw const FormatException('Invalid subscription note.');
      }
      patch['note'] = note.trim();
    }
    if (json.containsKey('alertDays')) {
      final alert = json['alertDays'];
      if (alert is! int || alert < 0 || alert > 365) {
        throw const FormatException('Invalid subscription alert.');
      }
      patch['alert_days'] = alert;
    }
    return UpdateSubscriptionRequest(expectedVersion: version, patch: patch);
  }
  final int expectedVersion;
  final Map<String, dynamic> patch;
}
