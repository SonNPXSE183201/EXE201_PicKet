import '../../../core/media/image_format.dart';
import '../../finance/domain/usecases/snapshot_validation.dart';
export '../../finance/domain/usecases/snapshot_validation.dart'
    show validateSnapshot;
import 'dart:convert';
import 'dart:io';
import 'package:cryptography/cryptography.dart';
import 'package:path_provider/path_provider.dart';
import '../../finance/domain/entities/finance_data.dart';
import '../../finance/domain/usecases/finance_actions.dart';

String csvCell(Object? value) {
  var text = value?.toString() ?? '';
  if (RegExp(r'^[\s]*[=+@\-\t\r]').hasMatch(text)) text = "'$text";
  return '"${text.replaceAll('"', '""')}"';
}

String exportCsv(FinanceData data) =>
    '\uFEFF${[
      ['id', 'date', 'type', 'title', 'amount_vnd', 'wallet_id', 'category', 'note', 'refund_of'],
      ...data.entries.map((e) => [e.id, e.date.toIso8601String(), e.refundOf != null ? 'refund' : e.type.name, e.title, e.amount, e.walletId, e.category, e.note, e.refundOf ?? '']),
    ].map((row) => row.map(csvCell).join(',')).join('\r\n')}';

class BackupService {
  final cipher = AesGcm.with256bits();
  Future<SecretKey> _derive(String password, List<int> salt) => Pbkdf2(
    macAlgorithm: Hmac.sha256(),
    iterations: 210000,
    bits: 256,
  ).deriveKey(secretKey: SecretKey(utf8.encode(password)), nonce: salt);
  Future<String> export(FinanceData data, String password) async {
    if (password.length < 12) {
      throw ArgumentError('Mật khẩu bản sao cần ít nhất 12 ký tự.');
    }
    final payload = data.toJson();
    final media = <String, String>{};
    final documents = await getApplicationDocumentsDirectory();
    var totalBytes = 0;
    for (final pair in [
      ('entries', 'receiptPath'),
      ('keepsakes', 'photoPath'),
    ]) {
      for (final item in payload[pair.$1] as List) {
        final path = item[pair.$2] as String?;
        if (path == null) continue;
        final file = File(path);
        final resolved = await file.resolveSymbolicLinks();
        if (!resolved.startsWith(
              '${documents.path}${Platform.pathSeparator}',
            ) &&
            !resolved.startsWith('${documents.path}/')) {
          throw const FormatException('Invalid photo location');
        }
        final bytes = await file.readAsBytes();
        totalBytes += bytes.length;
        if (totalBytes > 50000000) {
          throw ArgumentError('Ảnh vượt giới hạn sao lưu 50 MB.');
        }
        final key = 'image:${media.length}';
        media[key] = base64Encode(bytes);
        item[pair.$2] = key;
      }
    }
    final salt = await cipher.newSecretKey().then((k) => k.extractBytes());
    final box = await cipher.encrypt(
      utf8.encode(jsonEncode({'data': payload, 'media': media})),
      secretKey: await _derive(password, salt),
    );
    return jsonEncode({
      'format': 'picket-backup-v1',
      'salt': base64Encode(salt),
      'nonce': base64Encode(box.nonce),
      'mac': base64Encode(box.mac.bytes),
      'ciphertext': base64Encode(box.cipherText),
    });
  }

  Future<FinanceData> restore(String encoded, String password) async {
    if (encoded.length > 100000000) {
      throw const FormatException('Backup too large');
    }
    final envelope = jsonDecode(encoded) as Map<String, dynamic>;
    if (envelope['format'] != 'picket-backup-v1') {
      throw const FormatException('Invalid backup format');
    }
    final box = SecretBox(
      base64Decode(envelope['ciphertext'] as String),
      nonce: base64Decode(envelope['nonce'] as String),
      mac: Mac(base64Decode(envelope['mac'] as String)),
    );
    final plain = await cipher.decrypt(
      box,
      secretKey: await _derive(
        password,
        base64Decode(envelope['salt'] as String),
      ),
    );
    final backup = jsonDecode(utf8.decode(plain)) as Map<String, dynamic>;
    final payload = Map<String, dynamic>.from(backup['data'] as Map);
    final media = Map<String, dynamic>.from(backup['media'] as Map);
    validateSnapshot(FinanceData.fromJson(payload));
    final documents = await getApplicationDocumentsDirectory();
    final directory = await Directory(
      '${documents.path}/picket_photos/restored_${newId()}',
    ).create(recursive: true);
    for (final pair in [
      ('entries', 'receiptPath'),
      ('keepsakes', 'photoPath'),
    ]) {
      for (final item in payload[pair.$1] as List) {
        final reference = item[pair.$2] as String?;
        if (reference == null) continue;
        if (!RegExp(r'^image:\d+$').hasMatch(reference) ||
            !media.containsKey(reference)) {
          throw const FormatException('Missing backup photo');
        }
        final bytes = base64Decode(media[reference] as String);
        if (bytes.length > 10485760) {
          throw const FormatException('Photo too large');
        }
        final file = File(
          '${directory.path}/${newId()}.${imageExtension(bytes)}',
        );
        await file.writeAsBytes(bytes, flush: true);
        item[pair.$2] = file.path;
      }
    }
    return FinanceData.fromJson(payload);
  }
}
