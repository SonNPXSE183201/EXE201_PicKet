import 'package:picket_api/src/telemetry_contract.dart';
import 'package:test/test.dart';

void main() {
  Map<String, dynamic> event() => {
    'id': '11111111-1111-4111-8111-111111111111',
    'sessionId': '22222222-2222-4222-8222-222222222222',
    'event': 'landing_view',
  };
  test('anonymous events are restricted to landing dimensions', () {
    expect(telemetryEvent(event(), anonymous: true)['channel'], 'landing');
    expect(
      () => telemetryEvent({
        ...event(),
        'event': 'meaningful_action',
      }, anonymous: true),
      throwsFormatException,
    );
    expect(
      () => telemetryEvent(event(), anonymous: false),
      throwsFormatException,
    );
  });
  test('telemetry refuses personal fields and malformed identifiers', () {
    for (final patch in <Map<String, dynamic>>[
      {'email': 'private@example.test'},
      {'campaign': 'private@example.test'},
      {'version': 'https://private.example'},
      {'id': 123},
      {'sessionId': null},
      {'campaign': 'x' * 121},
      {'environment': 'staging'},
    ]) {
      expect(
        () => telemetryEvent({...event(), ...patch}, anonymous: true),
        throwsFormatException,
      );
    }
  });
}
