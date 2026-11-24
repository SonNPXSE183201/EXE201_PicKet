import 'package:test/test.dart';

import '../routes/v1/forecast/settings.dart' as route;

void main() {
  test('fallback keeps the paid forecast locked and reports sign-in', () {
    final signedOut = route.fallbackForecastSettings(signedIn: false);
    final signedIn = route.fallbackForecastSettings(signedIn: true);
    expect(signedOut['allowed'], isFalse);
    expect(signedOut['scenario'], isFalse);
    expect(signedOut['signedIn'], isFalse);
    expect(signedIn['signedIn'], isTrue);
    expect(signedIn['allowed'], isFalse);
    expect(signedIn['enabled'], isTrue);
  });
}
