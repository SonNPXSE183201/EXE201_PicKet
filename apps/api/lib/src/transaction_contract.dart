import 'package:picket_api/src/resource_validation.dart';
export 'package:picket_api/src/resource_validation.dart'
    show validateIdempotencyKey;

const supportedTransactionKinds = {'expense', 'income'};

class TransactionResource {
  const TransactionResource({
    required this.id,
    required this.accountId,
    required this.title,
    required this.amount,
    required this.kind,
    required this.occurredAt,
    required this.note,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.destinationAccountId,
    this.categoryId,
    this.refundOfTransactionId,
    this.deletedAt,
  });

  factory TransactionResource.fromDatabase(Map<String, dynamic> row) =>
      TransactionResource(
        id: row['id'] as String,
        accountId: row['wallet_id'] as String,
        destinationAccountId: row['destination_wallet_id'] as String?,
        categoryId: row['category_id'] as String?,
        refundOfTransactionId: row['refund_of'] as String?,
        title: row['title'] as String,
        amount: row['amount'] as int,
        kind: row['kind'] as String,
        occurredAt: DateTime.parse(row['occurred_at'] as String),
        note: row['note'] as String,
        version: row['row_version'] as int,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
        deletedAt: row['deleted_at'] == null
            ? null
            : DateTime.parse(row['deleted_at'] as String),
      );

  final String id;
  final String accountId;
  final String? destinationAccountId;
  final String? categoryId;
  final String? refundOfTransactionId;
  final String title;
  final int amount;
  final String kind;
  final DateTime occurredAt;
  final String note;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? deletedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'accountId': accountId,
    'destinationAccountId': destinationAccountId,
    'categoryId': categoryId,
    'refundOfTransactionId': refundOfTransactionId,
    'title': title,
    'amount': amount,
    'kind': kind,
    'occurredAt': occurredAt.toUtc().toIso8601String(),
    'note': note,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': deletedAt?.toUtc().toIso8601String(),
  };
}

class CreateTransactionRequest {
  const CreateTransactionRequest({
    required this.accountId,
    required this.title,
    required this.amount,
    required this.kind,
    required this.occurredAt,
    required this.note,
    this.categoryId,
  });

  factory CreateTransactionRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) => !{
        'accountId',
        'categoryId',
        'title',
        'amount',
        'kind',
        'occurredAt',
        'note',
      }.contains(key),
    )) {
      throw const FormatException('Invalid transaction fields.');
    }
    final amount = json['amount'];
    if (amount is! int || amount <= 0 || amount > maxMoney) {
      throw const FormatException('Invalid transaction amount.');
    }
    return CreateTransactionRequest(
      accountId: validateUuid(json['accountId'] as String? ?? ''),
      categoryId: _nullableUuid(json['categoryId']),
      title: requiredText(json['title'], 160, 'Invalid transaction title.'),
      amount: amount,
      kind: _kind(json['kind']),
      occurredAt: _dateTime(json['occurredAt']),
      note: _note(json['note']),
    );
  }

  final String accountId;
  final String? categoryId;
  final String title;
  final int amount;
  final String kind;
  final DateTime occurredAt;
  final String note;

  Map<String, dynamic> toRpcJson(String idempotencyKey) => {
    'p_idempotency_key': idempotencyKey,
    'p_wallet_id': accountId,
    'p_category_id': categoryId,
    'p_title': title,
    'p_amount': amount,
    'p_kind': kind,
    'p_occurred_at': occurredAt.toUtc().toIso8601String(),
    'p_note': note,
  };
}

class UpdateTransactionRequest {
  const UpdateTransactionRequest({
    required this.expectedVersion,
    required this.patch,
  });

  factory UpdateTransactionRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final expectedVersion = json.remove('expectedVersion');
    if (expectedVersion is! int || expectedVersion < 1 || json.isEmpty) {
      throw const FormatException('Invalid transaction update.');
    }
    if (json.keys.any(
      (key) => !{
        'accountId',
        'categoryId',
        'title',
        'amount',
        'occurredAt',
        'note',
      }.contains(key),
    )) {
      throw const FormatException('Invalid transaction fields.');
    }
    final patch = <String, dynamic>{};
    if (json.containsKey('accountId')) {
      patch['wallet_id'] = validateUuid(json['accountId'] as String? ?? '');
    }
    if (json.containsKey('categoryId')) {
      patch['category_id'] = _nullableUuid(json['categoryId']);
    }
    if (json.containsKey('title')) {
      patch['title'] = requiredText(
        json['title'],
        160,
        'Invalid transaction title.',
      );
    }
    if (json.containsKey('amount')) {
      final amount = json['amount'];
      if (amount is! int || amount <= 0 || amount > maxMoney) {
        throw const FormatException('Invalid transaction amount.');
      }
      patch['amount'] = amount;
    }
    if (json.containsKey('occurredAt')) {
      patch['occurred_at'] = _dateTime(
        json['occurredAt'],
      ).toUtc().toIso8601String();
    }
    if (json.containsKey('note')) patch['note'] = _note(json['note']);
    return UpdateTransactionRequest(
      expectedVersion: expectedVersion,
      patch: patch,
    );
  }

  final int expectedVersion;
  final Map<String, dynamic> patch;
}

class CreateTransferRequest {
  const CreateTransferRequest({
    required this.sourceAccountId,
    required this.destinationAccountId,
    required this.title,
    required this.amount,
    required this.occurredAt,
    required this.note,
  });

  factory CreateTransferRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) => !{
        'sourceAccountId',
        'destinationAccountId',
        'title',
        'amount',
        'occurredAt',
        'note',
      }.contains(key),
    )) {
      throw const FormatException('Invalid transfer fields.');
    }
    final sourceAccountId = validateUuid(
      json['sourceAccountId'] as String? ?? '',
    );
    final destinationAccountId = validateUuid(
      json['destinationAccountId'] as String? ?? '',
    );
    final amount = json['amount'];
    if (sourceAccountId == destinationAccountId ||
        amount is! int ||
        amount <= 0 ||
        amount > maxMoney) {
      throw const FormatException('Invalid transfer data.');
    }
    return CreateTransferRequest(
      sourceAccountId: sourceAccountId,
      destinationAccountId: destinationAccountId,
      title: requiredText(json['title'], 160, 'Invalid transfer title.'),
      amount: amount,
      occurredAt: _dateTime(json['occurredAt']),
      note: _note(json['note']),
    );
  }

  final String sourceAccountId;
  final String destinationAccountId;
  final String title;
  final int amount;
  final DateTime occurredAt;
  final String note;

  Map<String, dynamic> toRpcJson(String idempotencyKey) => {
    'p_idempotency_key': idempotencyKey,
    'p_source_wallet_id': sourceAccountId,
    'p_destination_wallet_id': destinationAccountId,
    'p_title': title,
    'p_amount': amount,
    'p_occurred_at': occurredAt.toUtc().toIso8601String(),
    'p_note': note,
  };
}

class CreateRefundRequest {
  const CreateRefundRequest({
    required this.amount,
    required this.occurredAt,
    required this.note,
  });

  factory CreateRefundRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) => !{'amount', 'occurredAt', 'note'}.contains(key),
    )) {
      throw const FormatException('Invalid refund fields.');
    }
    final amount = json['amount'];
    if (amount is! int || amount <= 0 || amount > maxMoney) {
      throw const FormatException('Invalid refund amount.');
    }
    return CreateRefundRequest(
      amount: amount,
      occurredAt: _dateTime(json['occurredAt']),
      note: _note(json['note']),
    );
  }

  final int amount;
  final DateTime occurredAt;
  final String note;

  Map<String, dynamic> toRpcJson(
    String idempotencyKey,
    String originalTransactionId,
  ) => {
    'p_idempotency_key': idempotencyKey,
    'p_original_transaction_id': originalTransactionId,
    'p_amount': amount,
    'p_occurred_at': occurredAt.toUtc().toIso8601String(),
    'p_note': note,
  };
}

class TransactionSplitResource {
  const TransactionSplitResource({
    required this.id,
    required this.transactionId,
    required this.categoryId,
    required this.amount,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TransactionSplitResource.fromDatabase(Map<String, dynamic> row) =>
      TransactionSplitResource(
        id: row['id'] as String,
        transactionId: row['transaction_id'] as String,
        categoryId: row['category_id'] as String,
        amount: row['amount'] as int,
        version: row['row_version'] as int,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
      );

  final String id;
  final String transactionId;
  final String categoryId;
  final int amount;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'transactionId': transactionId,
    'categoryId': categoryId,
    'amount': amount,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': null,
  };
}

class TransactionSplitInput {
  const TransactionSplitInput({
    required this.categoryId,
    required this.amount,
  });

  factory TransactionSplitInput.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid split item.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any((key) => !{'categoryId', 'amount'}.contains(key))) {
      throw const FormatException('Invalid split fields.');
    }
    final amount = json['amount'];
    if (amount is! int || amount <= 0 || amount > maxMoney) {
      throw const FormatException('Invalid split amount.');
    }
    return TransactionSplitInput(
      categoryId: validateUuid(json['categoryId'] as String? ?? ''),
      amount: amount,
    );
  }

  final String categoryId;
  final int amount;

  Map<String, dynamic> toJson() => {
    'categoryId': categoryId,
    'amount': amount,
  };
}

class SetTransactionSplitsRequest {
  const SetTransactionSplitsRequest({
    required this.expectedVersion,
    required this.splits,
  });

  factory SetTransactionSplitsRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any((key) => !{'expectedVersion', 'splits'}.contains(key)) ||
        json['expectedVersion'] is! int ||
        (json['expectedVersion'] as int) < 1 ||
        json['splits'] is! List) {
      throw const FormatException('Invalid split request.');
    }
    final splits = (json['splits'] as List)
        .map(TransactionSplitInput.fromJson)
        .toList();
    if (splits.length > 20 ||
        splits.map((item) => item.categoryId).toSet().length != splits.length) {
      throw const FormatException('Invalid split request.');
    }
    return SetTransactionSplitsRequest(
      expectedVersion: json['expectedVersion'] as int,
      splits: splits,
    );
  }

  final int expectedVersion;
  final List<TransactionSplitInput> splits;

  Map<String, dynamic> toRpcJson(String transactionId) => {
    'p_transaction_id': transactionId,
    'p_expected_version': expectedVersion,
    'p_splits': splits.map((item) => item.toJson()).toList(),
  };
}

String _kind(Object? value) {
  if (value is! String || !supportedTransactionKinds.contains(value)) {
    throw const FormatException('Unsupported transaction kind.');
  }
  return value;
}

String? _nullableUuid(Object? value) {
  if (value == null) return null;
  if (value is! String) {
    throw const FormatException('Invalid resource identifier.');
  }
  return validateUuid(value);
}

DateTime _dateTime(Object? value) {
  if (value is! String) {
    throw const FormatException('Invalid transaction date.');
  }
  final result = DateTime.tryParse(value);
  if (result == null) throw const FormatException('Invalid transaction date.');
  return result;
}

String _note(Object? value) {
  if (value == null) return '';
  if (value is! String || value.length > 2000) {
    throw const FormatException('Invalid transaction note.');
  }
  return value;
}
