import 'package:picket_api/src/resource_validation.dart';

const billStatuses = {'pending', 'paid', 'overdue', 'cancelled'};

DateTime _requiredDateTime(Object? value, String message) {
  if (value is! String) throw FormatException(message);
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException(message);
  return parsed.toUtc();
}

class BillResource {
  const BillResource({
    required this.id,
    required this.title,
    required this.amount,
    required this.dueAt,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.paidTransactionId,
    this.archivedAt,
  });

  factory BillResource.fromDatabase(Map<String, dynamic> row) => BillResource(
    id: row['id'] as String,
    paidTransactionId: row['paid_transaction_id'] as String?,
    title: row['title'] as String,
    amount: row['amount'] as int,
    dueAt: DateTime.parse(row['due_at'] as String),
    status: row['status'] as String,
    version: row['row_version'] as int,
    createdAt: DateTime.parse(row['created_at'] as String),
    updatedAt: DateTime.parse(row['updated_at'] as String),
    archivedAt: row['archived_at'] == null
        ? null
        : DateTime.parse(row['archived_at'] as String),
  );

  final String id;
  final String? paidTransactionId;
  final String title;
  final int amount;
  final DateTime dueAt;
  final String status;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'paidTransactionId': paidTransactionId,
    'title': title,
    'amount': amount,
    'dueAt': dueAt.toUtc().toIso8601String(),
    'status': status,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': archivedAt?.toUtc().toIso8601String(),
  };
}

class CreateBillRequest {
  const CreateBillRequest({
    required this.title,
    required this.amount,
    required this.dueAt,
  });

  factory CreateBillRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any((key) => !{'title', 'amount', 'dueAt'}.contains(key))) {
      throw const FormatException('Invalid bill fields.');
    }
    final amount = json['amount'];
    if (amount is! int || amount <= 0 || amount > maxMoney) {
      throw const FormatException('Invalid bill amount.');
    }
    return CreateBillRequest(
      title: requiredText(json['title'], 160, 'Invalid bill title.'),
      amount: amount,
      dueAt: _requiredDateTime(json['dueAt'], 'Invalid bill due date.'),
    );
  }

  final String title;
  final int amount;
  final DateTime dueAt;

  Map<String, dynamic> toDatabaseJson() => {
    'title': title,
    'amount': amount,
    'due_at': dueAt.toIso8601String(),
  };

  Map<String, dynamic> toRpcJson(String idempotencyKey) => {
    'p_idempotency_key': idempotencyKey,
    'p_title': title,
    'p_amount': amount,
    'p_due_at': dueAt.toIso8601String(),
  };
}

class UpdateBillRequest {
  const UpdateBillRequest({required this.expectedVersion, required this.patch});

  factory UpdateBillRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final version = json.remove('expectedVersion');
    const fields = {'title', 'amount', 'dueAt', 'status', 'paidTransactionId'};
    if (version is! int ||
        version < 1 ||
        json.isEmpty ||
        json.keys.any((key) => !fields.contains(key))) {
      throw const FormatException('Invalid bill update.');
    }
    final patch = <String, dynamic>{};
    if (json.containsKey('title')) {
      patch['title'] = requiredText(json['title'], 160, 'Invalid bill title.');
    }
    if (json.containsKey('amount')) {
      final amount = json['amount'];
      if (amount is! int || amount <= 0 || amount > maxMoney) {
        throw const FormatException('Invalid bill amount.');
      }
      patch['amount'] = amount;
    }
    if (json.containsKey('dueAt')) {
      patch['due_at'] = _requiredDateTime(
        json['dueAt'],
        'Invalid bill due date.',
      ).toIso8601String();
    }
    if (json.containsKey('status')) {
      final status = json['status'];
      if (status is! String || !billStatuses.contains(status)) {
        throw const FormatException('Invalid bill status.');
      }
      patch['status'] = status;
    }
    if (json.containsKey('paidTransactionId')) {
      final transactionId = json['paidTransactionId'];
      if (transactionId != null && transactionId is! String) {
        throw const FormatException('Invalid payment transaction.');
      }
      patch['paid_transaction_id'] = transactionId == null
          ? null
          : validateUuid(transactionId as String);
    }
    return UpdateBillRequest(expectedVersion: version, patch: patch);
  }

  final int expectedVersion;
  final Map<String, dynamic> patch;
}
