import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart' as hashing;
import 'package:cryptography/cryptography.dart';

class QuickLoginCrypto {
  QuickLoginCrypto(List<int> key) : _key = List<int>.unmodifiable(key) {
    if (key.length != 32) {
      throw const FormatException('Quick login key must contain 32 bytes.');
    }
  }
  final List<int> _key;
  final _cipher = AesGcm.with256bits();
  static String newDeviceToken() => base64UrlEncode(
    List<int>.generate(32, (_) => Random.secure().nextInt(256)),
  );
  static String deviceHash(String token) =>
      hashing.sha256.convert(utf8.encode(token)).toString();
  // Server-keyed verifier prevents offline enumeration of a six-digit PIN
  // from a database dump. A compromised server key requires revoking devices.
  String verifier(String pin, String device) {
    if (!RegExp(r'^\d{6}$').hasMatch(pin)) {
      throw const FormatException('PIN must contain six digits.');
    }
    return hashing.Hmac(
      hashing.sha256,
      _key,
    ).convert(utf8.encode('picket-pin-v1:$device:$pin')).toString();
  }

  Future<String> encrypt(String value, String device) async {
    final box = await _cipher.encrypt(
      utf8.encode(value),
      secretKey: SecretKey(_key),
      aad: utf8.encode(device),
    );
    return base64Encode(box.concatenation());
  }

  Future<String> decrypt(String value, String device) async => utf8.decode(
    await _cipher.decrypt(
      SecretBox.fromConcatenation(
        base64Decode(value),
        nonceLength: 12,
        macLength: 16,
      ),
      secretKey: SecretKey(_key),
      aad: utf8.encode(device),
    ),
  );
}
