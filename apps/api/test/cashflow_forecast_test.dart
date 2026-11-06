import 'dart:convert';
import 'dart:io';
import 'package:picket_api/src/cashflow_forecast.dart';
import 'package:test/test.dart';

void main() {
  final fixtures =
      jsonDecode(
            File(
              '../../packages/finance-fixtures/cashflow-v1.json',
            ).readAsStringSync().replaceFirst('\uFEFF', ''),
          )
          as List;
  for (final item in fixtures) {
    final fixture = Map<String, dynamic>.from(item as Map);
    final expected = Map<String, dynamic>.from(fixture['expected'] as Map);
    test('shared arithmetic: ${fixture['name']}', () {
      final result = calculateCashflow(
        Map<String, dynamic>.from(fixture['input'] as Map),
        purchase: fixture['purchase'] == null
            ? null
            : Map<String, dynamic>.from(fixture['purchase'] as Map),
      );
      expect(result['lastBalance'], expected['lastBalance']);
      expect(
        result['scenarioLastBalance'],
        expected['scenarioLastBalance'],
      );
      expect(result['minimum'], expected['minimum']);
    });
  }
  test('invalid scope and mixed currencies reject', () {
    expect(
      () => calculateCashflow({
        'startDay': '2026-02-30',
        'days': 7,
        'currency': 'VND',
        'openingBalance': 0,
        'occurrences': <Object?>[],
      }),
      throwsFormatException,
    );
  });
}
