DateTime _day(Object? value) {
  if (value is! String || !RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
    throw const FormatException('Invalid forecast day.');
  }
  final parsed = DateTime.tryParse('${value}T00:00:00Z');
  if (parsed == null || parsed.toIso8601String().substring(0, 10) != value) {
    throw const FormatException('Invalid calendar day.');
  }
  return parsed;
}

int _money(Object? value) {
  if (value is! int || value.abs() > 9000000000000) {
    throw const FormatException('Invalid forecast amount.');
  }
  return value;
}

/// Explicit F0 schedule arithmetic; never writes to the financial ledger.
Map<String, dynamic> calculateCashflow(
  Map<String, dynamic> input, {
  Map<String, dynamic>? purchase,
}) {
  final start = _day(input['startDay']);
  final days = input['days'];
  final currency = input['currency'];
  if (days is! int ||
      !{7, 30}.contains(days) ||
      currency is! String ||
      !RegExp(r'^[A-Z]{3}$').hasMatch(currency) ||
      input['occurrences'] is! List) {
    throw const FormatException('Invalid forecast scope.');
  }
  var balance = _money(input['openingBalance']);
  var scenario = balance;
  var minimum = balance;
  final rows = <Map<String, dynamic>>[];
  final ids = <String>{};
  for (final value in input['occurrences'] as List) {
    if (value is! Map) throw const FormatException('Invalid occurrence.');
    final row = Map<String, dynamic>.from(value);
    final id = row['id'];
    if (id is! String ||
        id.isEmpty ||
        !ids.add(id) ||
        row['currency'] != currency ||
        row['settled'] is! bool) {
      throw const FormatException('Invalid occurrence identity or currency.');
    }
    _day(row['day']);
    _money(row['amount']);
    rows.add(row);
  }
  if (purchase != null) {
    final date = _day(purchase['day']);
    if (_money(purchase['amount']) <= 0 ||
        date.isBefore(start) ||
        !date.isBefore(start.add(Duration(days: days)))) {
      throw const FormatException('Invalid purchase scenario.');
    }
  }
  final baseline = <Map<String, dynamic>>[];
  final scenarioRows = <Map<String, dynamic>>[];
  for (var i = 0; i < days; i++) {
    final day = start.add(Duration(days: i)).toIso8601String().substring(0, 10);
    var movement = 0;
    for (final row in rows) {
      if (row['settled'] == false && row['day'] == day) {
        movement = _money(movement + _money(row['amount']));
      }
    }
    balance = _money(balance + movement);
    scenario = _money(
      scenario +
          movement -
          (purchase?['day'] == day ? _money(purchase!['amount']) : 0),
    );
    if (balance < minimum) minimum = balance;
    baseline.add({'day': day, 'balance': balance});
    if (purchase != null) scenarioRows.add({'day': day, 'balance': scenario});
  }
  return {
    'kind': 'explicit-schedule-scenario',
    'currency': currency,
    'baseline': baseline,
    'scenario': purchase == null ? null : scenarioRows,
    'lastBalance': balance,
    'scenarioLastBalance': purchase == null ? null : scenario,
    'minimum': minimum,
  };
}
