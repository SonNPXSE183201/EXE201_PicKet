import 'package:picket_api/src/quick_login_crypto.dart';
import 'package:test/test.dart';

void main() {
  test(
    'vault encryption binds refresh tokens to browser and rejects wrong key',
    () async {
      final crypto = QuickLoginCrypto(List<int>.filled(32, 7));
      final cipher = await crypto.encrypt('refresh-secret', 'device-a');
      expect(cipher, isNot(contains('refresh-secret')));
      expect(await crypto.decrypt(cipher, 'device-a'), 'refresh-secret');
      await expectLater(crypto.decrypt(cipher, 'device-b'), throwsA(anything));
      await expectLater(
        QuickLoginCrypto(List<int>.filled(32, 8)).decrypt(cipher, 'device-a'),
        throwsA(anything),
      );
    },
  );
  test('PIN verifier is browser-bound; only six digits accepted', () {
    final crypto = QuickLoginCrypto(List<int>.filled(32, 7));
    expect(
      crypto.verifier('123456', 'a'),
      isNot(crypto.verifier('123456', 'b')),
    );
    expect(() => crypto.verifier('12345', 'a'), throwsFormatException);
    expect(() => crypto.verifier('abcdef', 'a'), throwsFormatException);
  });
}
