import 'package:picket_api/src/resource_validation.dart';

class BudgetResource {
  const BudgetResource({
    required this.id,
    required this.categoryId,
    required this.name,
    required this.defaultLimit,
    required this.alertPercent,
    required this.active,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.archivedAt,
  });
  factory BudgetResource.fromDatabase(Map<String, dynamic> row) =>
      BudgetResource(
        id: row['id'] as String,
        categoryId: row['category_id'] as String,
        name: row['name'] as String,
        defaultLimit: row['default_limit'] as int,
        alertPercent: row['alert_percent'] as int,
        active: row['active'] as bool,
        version: row['row_version'] as int,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
        archivedAt: row['archived_at'] == null
            ? null
            : DateTime.parse(row['archived_at'] as String),
      );
  final String id;
  final String categoryId;
  final String name;
  final int defaultLimit;
  final int alertPercent;
  final bool active;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;
  Map<String, dynamic> toJson() => {
    'id': id,
    'categoryId': categoryId,
    'name': name,
    'defaultLimit': defaultLimit,
    'alertPercent': alertPercent,
    'active': active,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': archivedAt?.toUtc().toIso8601String(),
  };
}

class CreateBudgetRequest {
  const CreateBudgetRequest({
    required this.categoryId,
    required this.name,
    required this.defaultLimit,
    required this.alertPercent,
  });
  factory CreateBudgetRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) =>
          !{'categoryId', 'name', 'defaultLimit', 'alertPercent'}.contains(key),
    )) {
      throw const FormatException('Invalid budget fields.');
    }
    final categoryId = json['categoryId'];
    if (categoryId is! String) {
      throw const FormatException('Invalid budget category.');
    }
    final limit = json['defaultLimit'];
    final alert = json['alertPercent'];
    if (limit is! int ||
        limit <= 0 ||
        limit > maxMoney ||
        alert is! int ||
        alert < 1 ||
        alert > 100) {
      throw const FormatException('Invalid budget amount or alert.');
    }
    return CreateBudgetRequest(
      categoryId: validateUuid(categoryId),
      name: requiredText(json['name'], 120, 'Invalid budget name.'),
      defaultLimit: limit,
      alertPercent: alert,
    );
  }
  final String categoryId;
  final String name;
  final int defaultLimit;
  final int alertPercent;
  Map<String, dynamic> toDatabaseJson() => {
    'category_id': categoryId,
    'name': name,
    'default_limit': defaultLimit,
    'alert_percent': alertPercent,
  };
  Map<String, dynamic> toRpcJson(String idempotencyKey) => {
    'p_idempotency_key': idempotencyKey,
    'p_category_id': categoryId,
    'p_name': name,
    'p_default_limit': defaultLimit,
    'p_alert_percent': alertPercent,
  };
}

class UpdateBudgetRequest {
  const UpdateBudgetRequest({
    required this.expectedVersion,
    required this.patch,
  });
  factory UpdateBudgetRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final version = json.remove('expectedVersion');
    if (version is! int ||
        version < 1 ||
        json.isEmpty ||
        json.keys.any(
          (key) =>
              !{'name', 'defaultLimit', 'alertPercent', 'active'}.contains(key),
        )) {
      throw const FormatException('Invalid budget update.');
    }
    final patch = <String, dynamic>{};
    if (json.containsKey('name')) {
      patch['name'] = requiredText(json['name'], 120, 'Invalid budget name.');
    }
    if (json.containsKey('defaultLimit')) {
      final limit = json['defaultLimit'];
      if (limit is! int || limit <= 0 || limit > maxMoney) {
        throw const FormatException('Invalid budget limit.');
      }
      patch['default_limit'] = limit;
    }
    if (json.containsKey('alertPercent')) {
      final alert = json['alertPercent'];
      if (alert is! int || alert < 1 || alert > 100) {
        throw const FormatException('Invalid budget alert.');
      }
      patch['alert_percent'] = alert;
    }
    if (json.containsKey('active')) {
      final active = json['active'];
      if (active is! bool) {
        throw const FormatException('Invalid budget active flag.');
      }
      patch['active'] = active;
    }
    return UpdateBudgetRequest(expectedVersion: version, patch: patch);
  }
  final int expectedVersion;
  final Map<String, dynamic> patch;
}
