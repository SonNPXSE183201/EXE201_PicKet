import 'package:picket_api/src/revenue_csv.dart';
import 'package:test/test.dart';

void main() {
  test('revenue CSV keeps trace columns and neutralises formulas', () {
    final csv = revenueCsv([
      {
        'id': 7,
        'source': 'payos',
        'kind': 'charge',
        'status': 'confirmed',
        'external_ref': 'FT123',
        'order_code': 1000000001,
        'amount_vnd': 19000,
        'note': '=HYPERLINK("x")',
      },
      {'id': 8, 'source': 'google_play', 'amount_vnd': -19000},
    ]);
    final lines = csv.trim().split('\r\n');
    expect(lines.first, startsWith('id,source,kind,status,external_ref'));
    expect(lines[1], contains('"FT123"'));
    expect(lines[1], contains('"\'=HYPERLINK(""x"")"'));
    expect(lines[2], contains('"-19000"'));
  });
}
