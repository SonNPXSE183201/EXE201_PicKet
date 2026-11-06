import 'package:picket_api/src/resource_validation.dart';

class KeepsakeResource {
  const KeepsakeResource(this.row);
  factory KeepsakeResource.fromDatabase(Map<String, dynamic> row) =>
      KeepsakeResource(row);
  final Map<String, dynamic> row;
  Map<String, dynamic> toJson() => {
    'id': row['id'],
    'title': row['title'],
    'amount': row['amount'],
    'purchasedAt': row['purchased_at'],
    'note': row['note'],
    'category': row['category_name'],
    'warrantyUntil': row['warranty_until'],
    'returnUntil': row['return_until'],
    'mediaPath': row['media_path'],
    'version': row['row_version'],
    'createdAt': row['created_at'],
    'updatedAt': row['updated_at'],
    'deletedAt': row['archived_at'],
  };
}

String _dateTime(Object? value) {
  if (value is! String || DateTime.tryParse(value) == null) {
    throw const FormatException('Invalid keepsake date.');
  }
  return DateTime.parse(value).toUtc().toIso8601String();
}

String? _date(Object? value) {
  if (value == null) return null;
  if (value is! String ||
      !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value) ||
      DateTime.tryParse(value) == null) {
    throw const FormatException('Invalid keepsake deadline.');
  }
  return value;
}

String? _media(Object? value, String ownerId) {
  if (value == null) return null;
  final pathPrefix = '$ownerId/keepsakes/';
  if (value is! String ||
      value.length > 500 ||
      !value.startsWith(pathPrefix) ||
      !RegExp(
        r'^[0-9a-fA-F-]+\.(jpg|jpeg|png|webp)$',
      ).hasMatch(value.substring(pathPrefix.length))) {
    throw const FormatException('Invalid keepsake media path.');
  }
  return value;
}

Map<String, dynamic> parseKeepsakeCreate(Object? value, String ownerId) {
  if (value is! Map) throw const FormatException('Invalid JSON body.');
  final json = Map<String, dynamic>.from(value);
  const fields = {
    'id',
    'title',
    'amount',
    'purchasedAt',
    'note',
    'category',
    'warrantyUntil',
    'returnUntil',
    'mediaPath',
  };
  if (json.keys.any((key) => !fields.contains(key))) {
    throw const FormatException('Invalid keepsake fields.');
  }
  if (json['id'] is! String) {
    throw const FormatException('Invalid keepsake identifier.');
  }
  final amount = json['amount'];
  if (amount is! int || amount < 0 || amount > maxMoney) {
    throw const FormatException('Invalid keepsake amount.');
  }
  final note = json['note'] ?? '';
  if (note is! String || note.length > 2000) {
    throw const FormatException('Invalid keepsake note.');
  }
  return {
    'id': validateUuid(json['id'] as String),
    'user_id': ownerId,
    'title': requiredText(json['title'], 160, 'Invalid keepsake title.'),
    'amount': amount,
    'purchased_at': _dateTime(json['purchasedAt']),
    'note': note,
    'category_name': requiredText(
      json['category'],
      80,
      'Invalid keepsake category.',
    ),
    'warranty_until': _date(json['warrantyUntil']),
    'return_until': _date(json['returnUntil']),
    'media_path': _media(json['mediaPath'], ownerId),
  };
}

({int expectedVersion, Map<String, dynamic> patch}) parseKeepsakeUpdate(
  Object? value,
  String ownerId,
) {
  if (value is! Map) throw const FormatException('Invalid JSON body.');
  final json = Map<String, dynamic>.from(value);
  final version = json.remove('expectedVersion');
  const fields = {
    'title',
    'amount',
    'purchasedAt',
    'note',
    'category',
    'warrantyUntil',
    'returnUntil',
    'mediaPath',
  };
  if (version is! int ||
      version < 1 ||
      json.isEmpty ||
      json.keys.any((key) => !fields.contains(key))) {
    throw const FormatException('Invalid keepsake update.');
  }
  final patch = <String, dynamic>{};
  if (json.containsKey('title')) {
    patch['title'] = requiredText(
      json['title'],
      160,
      'Invalid keepsake title.',
    );
  }
  if (json.containsKey('amount')) {
    final amount = json['amount'];
    if (amount is! int || amount < 0 || amount > maxMoney) {
      throw const FormatException('Invalid keepsake amount.');
    }
    patch['amount'] = amount;
  }
  if (json.containsKey('purchasedAt')) {
    patch['purchased_at'] = _dateTime(json['purchasedAt']);
  }
  if (json.containsKey('note')) {
    final note = json['note'];
    if (note is! String || note.length > 2000) {
      throw const FormatException('Invalid keepsake note.');
    }
    patch['note'] = note;
  }
  if (json.containsKey('category')) {
    patch['category_name'] = requiredText(
      json['category'],
      80,
      'Invalid keepsake category.',
    );
  }
  if (json.containsKey('warrantyUntil')) {
    patch['warranty_until'] = _date(json['warrantyUntil']);
  }
  if (json.containsKey('returnUntil')) {
    patch['return_until'] = _date(json['returnUntil']);
  }
  if (json.containsKey('mediaPath')) {
    patch['media_path'] = _media(json['mediaPath'], ownerId);
  }
  return (expectedVersion: version, patch: patch);
}
