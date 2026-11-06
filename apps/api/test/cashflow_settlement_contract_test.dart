import 'package:picket_api/src/cashflow_settlement_contract.dart';
import 'package:test/test.dart';

const sid = '44444444-1234-4321-8123-123456789011';
const tx = '44444444-1234-4321-8123-123456789012';
Map<String, dynamic> link() => {
  'occurrenceId': '$sid:2026-10-24',
  'day': '2026-10-24',
  'amount': -19000,
  'currency': 'VND',
  'transactionId': tx,
  'transactionUpdatedAt': '2026-10-24T12:00:00Z',
};
void main() {
  test('settlement documents preserve revisions and exact evidence', () {
    final doc = {
      'schemaVersion': 1,
      'revision': 3,
      'links': [link()],
      'appliedRevision': 1,
    };
    expect(validateSettlementDocument(doc), doc);
    expect(
      validateSettlementMutation({
        'expectedRevision': 2,
        'links': [link()],
      }),
      {
        'p_expected_revision': 2,
        'p_links': [link()],
      },
    );
  });
  test(
    'settlement contract rejects duplicate evidence and malformed values',
    () {
      for (final changed in [
        {'day': '2026-02-30'},
        {'amount': 0},
        {'amount': 1.5},
        {'currency': 'usd'},
        {'transactionId': 'other'},
        {'transactionUpdatedAt': 'bad'},
        {'occurrenceId': '$sid:2026-10-25'},
        {'owner': 'other'},
      ]) {
        expect(
          () => validateSettlementDocument({
            'schemaVersion': 1,
            'revision': 0,
            'links': [
              {...link(), ...changed},
            ],
          }),
          throwsFormatException,
        );
      }
      expect(
        () => validateSettlementMutation({
          'expectedRevision': 0,
          'links': [link(), link()],
        }),
        throwsFormatException,
      );
      expect(
        () => validateSettlementMutation({
          'expectedRevision': 0,
          'links': <Object>[],
          'owner': 'other',
        }),
        throwsFormatException,
      );
      expect(
        () => validateSettlementDocument({
          'schemaVersion': 1,
          'revision': 2,
          'links': <Object>[],
          'appliedRevision': 3,
        }),
        throwsFormatException,
      );
    },
  );
}
