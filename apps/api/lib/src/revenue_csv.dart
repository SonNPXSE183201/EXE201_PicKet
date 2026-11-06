/// CSV export of revenue ledger entries with every trace field, so a figure
/// on the dashboard can be followed back to the PayOS reference or the Google
/// order number. Values are quoted and formula-like cells are neutralised.
String revenueCsv(List<Object?> entries) {
  const columns = [
    'id',
    'source',
    'kind',
    'status',
    'external_ref',
    'order_code',
    'payment_order_id',
    'user_id',
    'sku',
    'tier',
    'currency',
    'amount_original',
    'amount_vnd',
    'is_test',
    'occurred_at',
    'recorded_at',
    'revisions',
    'note',
  ];
  String cell(Object? value) {
    var text = value == null ? '' : value.toString();
    if (text.isNotEmpty &&
        '=+-@\t\r'.contains(text[0]) &&
        num.tryParse(text) == null) {
      text = "'$text";
    }
    return '"${text.replaceAll('"', '""')}"';
  }

  final lines = [columns.join(',')];
  for (final entry in entries) {
    final row = entry! as Map;
    lines.add(columns.map((c) => cell(row[c])).join(','));
  }
  return '${lines.join('\r\n')}\r\n';
}
