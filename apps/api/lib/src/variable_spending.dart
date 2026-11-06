/// Experimental F1 contract, shared with the mobile offline implementation.
Map<String, dynamic> estimateVariableSpending(Map<String, dynamic> input) {
  final origin = _day(input['startDay']);
  final days = input['days'];
  final currency = input['currency'];
  final history = input['history'];
  if (days is! int ||
      !{7, 30}.contains(days) ||
      currency is! String ||
      !RegExp(r'^[A-Z]{3}$').hasMatch(currency) ||
      history is! List ||
      history.length > 3660) {
    throw const FormatException('Invalid estimate scope.');
  }
  final seen = <String>{};
  final amounts = <int>[];
  for (final row in history) {
    if (row is! Map) throw const FormatException('Invalid observed day.');
    final date = _day(row['day']);
    final amount = row['amount'];
    if (!seen.add(row['day'] as String) ||
        row['currency'] != currency ||
        row['complete'] is! bool ||
        amount is! int ||
        amount < 0 ||
        amount > 9000000000000) {
      throw const FormatException('Invalid variable expense history.');
    }
    if (row['complete'] == true &&
        date.isBefore(origin) &&
        !date.isBefore(origin.subtract(const Duration(days: 28)))) {
      amounts.add(amount);
    }
  }
  const uncertainty =
      'Experimental trailing median; no calibrated confidence interval '
      'or spending permission.';
  const completeness =
      'Only explicitly complete days and variable expenses are represented; '
      'missing days are unknown.';
  const scheduling =
      'Scheduled obligations must be excluded from this input '
      'to prevent counting them twice.';
  const limitations = [uncertainty, completeness, scheduling];
  if (amounts.length < 28) {
    return {
      'kind': 'insufficient-history',
      'dailyAmount': null,
      'observedDays': amounts.length,
      'occurrences': <Map<String, dynamic>>[],
      'limitations': limitations,
    };
  }
  amounts.sort();
  final daily = ((amounts[13] + amounts[14]) / 2).ceil();
  return {
    'kind': 'trailing-median-scenario',
    'dailyAmount': daily,
    'observedDays': amounts.length,
    'limitations': limitations,
    'occurrences': List.generate(days, (index) {
      final date = origin
          .add(Duration(days: index))
          .toIso8601String()
          .substring(0, 10);
      return {
        'id': 'variable-estimate:$date',
        'day': date,
        'amount': -daily,
        'currency': currency,
        'settled': false,
      };
    }),
  };
}

DateTime _day(Object? value) {
  if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
    throw const FormatException('Invalid observed day.');
  }
  final date = DateTime.tryParse('${value}T00:00:00Z');
  if (date == null || date.toIso8601String().substring(0, 10) != value) {
    throw const FormatException('Invalid observed day.');
  }
  return date;
}
