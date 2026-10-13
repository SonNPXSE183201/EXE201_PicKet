import 'package:picket_api/src/export_contract.dart';
import 'package:picket_api/src/finance_contract.dart';
import 'package:test/test.dart';

void main() {
  test('wraps an authenticated snapshot in a versioned export envelope', () {
    final result = FinanceExportEnvelope.fromSnapshot(
      const FinanceSnapshotEnvelope(
        revision: 42,
        payload: {'version': 2, 'name': 'An'},
      ),
      exportedAt: DateTime.utc(2026, 10, 9, 12),
    );

    expect(result.toJson(), {
      'format': 'picket-export-v1',
      'schemaVersion': 1,
      'exportedAt': '2026-10-09T12:00:00.000Z',
      'revision': 42,
      'data': {'version': 2, 'name': 'An'},
    });
  });

  test('rejects export before finance data exists', () {
    expect(
      () => FinanceExportEnvelope.fromSnapshot(
        const FinanceSnapshotEnvelope(revision: 0, payload: null),
      ),
      throwsFormatException,
    );
  });
}
