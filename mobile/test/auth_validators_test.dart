import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/domain/auth_validators.dart';

void main() {
  test('normalizes and validates email', () {
    expect(normalizeEmail('  USER@Example.COM '), 'user@example.com');
    expect(validateEmail('user@example.com'), isNull);
    expect(validateEmail('not-an-email'), isNotNull);
  });

  test('requires a strong password for registration and recovery', () {
    expect(validatePassword('short1'), isNotNull);
    expect(validatePassword('onlyletterslong'), isNotNull);
    expect(validatePassword('StrongPassword1'), isNull);
  });

  test('accepts only OTP values with 6 to 8 digits', () {
    expect(validateOtp('123456'), isNull);
    expect(validateOtp('12345678'), isNull);
    expect(validateOtp('12345a'), isNotNull);
  });
}
