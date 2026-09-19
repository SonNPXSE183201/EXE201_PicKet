import 'dart:convert';
import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class PayloadCipher {
  Future<String> encrypt(String plaintext);
  Future<String> decrypt(String ciphertext);
}

class DeviceCipher implements PayloadCipher {
  DeviceCipher(this.scope, {FlutterSecureStorage? storage})
    : storage = storage ?? const FlutterSecureStorage();
  final String scope;
  final FlutterSecureStorage storage;
  final algorithm = AesGcm.with256bits();
  Future<SecretKey>? _keyFuture;
  Future<SecretKey> _key() => _keyFuture ??= _loadKey();
  Future<SecretKey> _loadKey() async {
    final name = 'picket.database.key.$scope';
    final existing = await storage.read(key: name);
    if (existing != null) return SecretKey(base64Decode(existing));
    final key = await algorithm.newSecretKey();
    await storage.write(
      key: name,
      value: base64Encode(await key.extractBytes()),
    );
    return key;
  }

  @override
  Future<String> encrypt(String plaintext) async {
    final box = await algorithm.encrypt(
      utf8.encode(plaintext),
      secretKey: await _key(),
    );
    return jsonEncode({
      'v': 1,
      'nonce': base64Encode(box.nonce),
      'ciphertext': base64Encode(box.cipherText),
      'mac': base64Encode(box.mac.bytes),
    });
  }

  @override
  Future<String> decrypt(String ciphertext) async {
    final j = jsonDecode(ciphertext) as Map<String, dynamic>;
    if (j['v'] != 1) {
      throw const FormatException('Unsupported encryption format');
    }
    final box = SecretBox(
      base64Decode(j['ciphertext'] as String),
      nonce: base64Decode(j['nonce'] as String),
      mac: Mac(base64Decode(j['mac'] as String)),
    );
    return utf8.decode(await algorithm.decrypt(box, secretKey: await _key()));
  }
}
