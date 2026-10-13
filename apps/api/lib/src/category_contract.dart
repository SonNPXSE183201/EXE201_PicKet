import 'package:picket_api/src/resource_validation.dart';

const categoryKinds = {'expense', 'income', 'both'};

class CategoryResource {
  const CategoryResource({
    required this.id,
    required this.name,
    required this.kind,
    required this.custom,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.color,
    this.icon,
    this.archivedAt,
  });

  factory CategoryResource.fromDatabase(Map<String, dynamic> row) =>
      CategoryResource(
        id: row['id'] as String,
        name: row['name'] as String,
        kind: row['kind'] as String,
        color: row['color'] as String?,
        icon: row['icon'] as String?,
        custom: row['is_custom'] as bool,
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
  final String? color;
  final String? icon;
  final bool custom;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'kind': kind,
    'color': color,
    'icon': icon,
    'custom': custom,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': archivedAt?.toUtc().toIso8601String(),
  };
}

class CreateCategoryRequest {
  const CreateCategoryRequest({
    required this.name,
    required this.kind,
    this.color,
    this.icon,
  });

  factory CreateCategoryRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) => !{'name', 'kind', 'color', 'icon'}.contains(key),
    )) {
      throw const FormatException('Invalid category fields.');
    }
    return CreateCategoryRequest(
      name: requiredText(json['name'], 80, 'Invalid category name.'),
      kind: _kind(json['kind']),
      color: _color(json['color']),
      icon: _optionalText(json['icon'], 80),
    );
  }

  final String name;
  final String kind;
  final String? color;
  final String? icon;

  Map<String, dynamic> toDatabaseJson() => {
    'name': name,
    'kind': kind,
    'color': color,
    'icon': icon,
    'is_custom': true,
  };

  Map<String, dynamic> toRpcJson(String idempotencyKey) => {
    'p_idempotency_key': idempotencyKey,
    'p_name': name,
    'p_kind': kind,
    'p_color': color,
    'p_icon': icon,
  };
}

class UpdateCategoryRequest {
  const UpdateCategoryRequest({
    required this.expectedVersion,
    required this.patch,
  });

  factory UpdateCategoryRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final expectedVersion = json.remove('expectedVersion');
    if (expectedVersion is! int || expectedVersion < 1 || json.isEmpty) {
      throw const FormatException('Invalid category update.');
    }
    if (json.keys.any(
      (key) => !{'name', 'kind', 'color', 'icon'}.contains(key),
    )) {
      throw const FormatException('Invalid category fields.');
    }
    final patch = <String, dynamic>{};
    if (json.containsKey('name')) {
      patch['name'] = requiredText(
        json['name'],
        80,
        'Invalid category name.',
      );
    }
    if (json.containsKey('kind')) patch['kind'] = _kind(json['kind']);
    if (json.containsKey('color')) patch['color'] = _color(json['color']);
    if (json.containsKey('icon')) {
      patch['icon'] = _optionalText(json['icon'], 80);
    }
    return UpdateCategoryRequest(
      expectedVersion: expectedVersion,
      patch: patch,
    );
  }

  final int expectedVersion;
  final Map<String, dynamic> patch;
}

String _kind(Object? value) {
  if (value is! String || !categoryKinds.contains(value)) {
    throw const FormatException('Invalid category kind.');
  }
  return value;
}

String? _color(Object? value) {
  if (value == null) return null;
  if (value is! String || !RegExp(r'^#[0-9A-Fa-f]{6}$').hasMatch(value)) {
    throw const FormatException('Invalid category color.');
  }
  return value.toUpperCase();
}

String? _optionalText(Object? value, int maxLength) {
  if (value == null) return null;
  if (value is! String || value.trim().length > maxLength) {
    throw const FormatException('Invalid optional text.');
  }
  return value.trim().isEmpty ? null : value.trim();
}
