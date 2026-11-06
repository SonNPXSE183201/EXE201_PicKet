import 'dart:convert';
import 'dart:io';
import 'package:picket_api/src/variable_spending.dart';
import 'package:test/test.dart';

void main() {
  final fixtures =
      jsonDecode(
            File(
              '../../packages/finance-fixtures/variable-spending-v1.json',
            ).readAsStringSync(),
          )
          as List;
  for (final value in fixtures) {
    final fixture = Map<String, dynamic>.from(value as Map);
    test('shared variable estimate: ${fixture['name']}', () {
      final result = estimateVariableSpending(
        Map<String, dynamic>.from(fixture['input'] as Map),
      );
      final expected = fixture['expected'] as Map;
      expect(result['kind'], expected['kind']);
      expect(result['dailyAmount'], expected['dailyAmount']);
      expect(result['observedDays'], expected['observedDays']);
      expect((result['occurrences'] as List).length, expected['occurrences']);
    });
  }
  test('malformed history rejects before producing an estimate', () {
    expect(
      () => estimateVariableSpending({'startDay': '2026-02-30'}),
      throwsFormatException,
    );
  });
}
