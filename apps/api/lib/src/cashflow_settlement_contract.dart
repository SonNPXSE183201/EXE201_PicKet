import 'package:picket_api/src/resource_validation.dart';

List<Map<String, dynamic>> _links(Object? value) {
  if (value is! List || value.length > 1000) {
    throw const FormatException('Invalid settlement links.');
  }
  final occurrences = <String>{};
  final transactions = <String>{};
  return value.map((row) {
    const fields = {
      'occurrenceId',
      'day',
      'amount',
      'currency',
      'transactionId',
      'transactionUpdatedAt',
    };
    if (row is! Map ||
        row.length != fields.length ||
        row.keys.any((key) => !fields.contains(key))) {
      throw const FormatException('Invalid settlement fields.');
    }
    final day = row['day'];
    final occurrence = row['occurrenceId'];
    final id = row['transactionId'];
    final updated = row['transactionUpdatedAt'];
    final amount = row['amount'];
    if (day is! String ||
        !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(day) ||
        DateTime.tryParse(
              '${day}T00:00:00Z',
            )?.toIso8601String().substring(0, 10) !=
            day ||
        occurrence is! String ||
        !occurrence.endsWith(':$day') ||
        id is! String ||
        updated is! String ||
        !RegExp(
          r'^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$',
        ).hasMatch(updated) ||
        DateTime.tryParse(updated) == null ||
        amount is! int ||
        amount == 0 ||
        amount.abs() > maxMoney) {
      throw const FormatException('Invalid settlement evidence.');
    }
    validateUuid(id);
    validateUuid(occurrence.substring(0, occurrence.length - 11));
    if (!occurrences.add(occurrence.toLowerCase()) ||
        !transactions.add(id.toLowerCase())) {
      throw const FormatException('Duplicate settlement evidence.');
    }
    return <String, dynamic>{
      'occurrenceId': occurrence,
      'day': day,
      'amount': amount,
      'currency': validateCurrencyCode(row['currency']),
      'transactionId': id,
      'transactionUpdatedAt': updated,
    };
  }).toList();
}

Map<String, dynamic> validateSettlementDocument(Object? value) {
  if (value is! Map ||
      value['schemaVersion'] != 1 ||
      value.keys.any(
        (key) => !{
          'schemaVersion',
          'revision',
          'links',
          'appliedRevision',
        }.contains(key),
      )) {
    throw const FormatException('Invalid settlement document.');
  }
  final revision = value['revision'];
  final applied = value['appliedRevision'];
  if (revision is! int ||
      revision < 0 ||
      revision > 9007199254740991 ||
      applied != null &&
          (applied is! int || applied < 1 || applied > revision)) {
    throw const FormatException('Invalid settlement revision.');
  }
  return {
    'schemaVersion': 1,
    'revision': revision,
    'links': _links(value['links']),
    if (applied != null) 'appliedRevision': applied,
  };
}

Map<String, dynamic> validateSettlementMutation(Object? value) {
  if (value is! Map ||
      value.length != 2 ||
      !value.containsKey('expectedRevision') ||
      !value.containsKey('links')) {
    throw const FormatException('Invalid settlement mutation.');
  }
  final revision = value['expectedRevision'];
  if (revision is! int || revision < 0 || revision >= 9007199254740991) {
    throw const FormatException('Invalid settlement revision.');
  }
  return {'p_expected_revision': revision, 'p_links': _links(value['links'])};
}
