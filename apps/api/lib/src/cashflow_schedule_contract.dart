import 'package:picket_api/src/resource_validation.dart';

class CashflowScheduleMutation {
  CashflowScheduleMutation._(this.revision, this.action, this.schedule);
  factory CashflowScheduleMutation.fromJson(
    Object? value,
    String id, {
    bool remove = false,
  }) {
    validateUuid(id);
    if (value is! Map ||
        value.length != (remove ? 1 : 2) ||
        value.keys.any(
          (key) => !{'expectedRevision', if (!remove) 'schedule'}.contains(key),
        )) {
      throw const FormatException('Invalid schedule request fields.');
    }
    final revision = value['expectedRevision'];
    if (revision is! int || revision < 0 || revision >= 9007199254740991) {
      throw const FormatException('Invalid schedule revision.');
    }
    final schedule = remove
        ? <String, dynamic>{'id': id}
        : validateSchedule(value['schedule']);
    if (schedule['id'] != id) {
      throw const FormatException('Schedule URL identity mismatch.');
    }
    return CashflowScheduleMutation._(
      revision,
      remove ? 'remove' : 'save',
      schedule,
    );
  }
  final int revision;
  final String action;
  final Map<String, dynamic> schedule;
  Map<String, dynamic> toRpcJson(String key) => {
    'p_request_key': key,
    'p_expected_revision': revision,
    'p_action': action,
    'p_schedule': schedule,
  };
}

Map<String, dynamic> validateSchedule(Object? value) {
  const required = {
    'id',
    'startDay',
    'frequency',
    'amount',
    'currency',
    'active',
  };
  if (value is! Map ||
      !value.keys.toSet().containsAll(required) ||
      value.keys.any(
        (key) => !{...required, 'endDay', 'walletId'}.contains(key),
      )) {
    throw const FormatException('Invalid schedule fields.');
  }
  final id = value['id'];
  if (id is! String) throw const FormatException('Invalid schedule ID.');
  validateUuid(id);
  final start = _day(value['startDay']);
  final end = value['endDay'] == null ? null : _day(value['endDay']);
  final amount = value['amount'];
  if (end != null && end.isBefore(start) ||
      !{'once', 'weekly', 'monthly'}.contains(value['frequency']) ||
      amount is! int ||
      amount == 0 ||
      amount.abs() > maxMoney ||
      value['active'] is! bool) {
    throw const FormatException('Invalid schedule values.');
  }
  final currency = validateCurrencyCode(value['currency']);
  final wallet = value['walletId'];
  if (value.containsKey('walletId')) {
    if (wallet is! String) {
      throw const FormatException('Invalid schedule wallet.');
    }
    validateUuid(wallet);
  }
  return {
    'id': id,
    'startDay': value['startDay'],
    if (end != null) 'endDay': value['endDay'],
    'frequency': value['frequency'],
    'amount': amount,
    'currency': currency,
    'active': value['active'],
    if (wallet != null) 'walletId': wallet,
  };
}

Map<String, dynamic> validateScheduleDocument(Object? value) {
  if (value is! Map || value['schemaVersion'] != 1) {
    throw const FormatException('Invalid schedule document.');
  }
  final revision = value['revision'];
  final rows = value['schedules'];
  final applied = value['appliedRevision'];
  if (revision is! int ||
      revision < 0 ||
      revision > 9007199254740991 ||
      rows is! List ||
      rows.length > 1000 ||
      (applied != null &&
          (applied is! int || applied < 1 || applied > revision))) {
    throw const FormatException('Invalid schedule document revision.');
  }
  final schedules = rows.map(validateSchedule).toList();
  if (schedules.map((row) => row['id']).toSet().length != schedules.length) {
    throw const FormatException('Duplicate schedule identity.');
  }
  return {
    'schemaVersion': 1,
    'revision': revision,
    'schedules': schedules,
    if (applied != null) 'appliedRevision': applied,
  };
}

DateTime _day(Object? value) {
  if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
    throw const FormatException('Invalid schedule day.');
  }
  final result = DateTime.tryParse('${value}T00:00:00Z');
  if (result == null || result.toIso8601String().substring(0, 10) != value) {
    throw const FormatException('Invalid schedule calendar day.');
  }
  return result;
}
