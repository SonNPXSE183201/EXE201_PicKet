import '../../../../core/media/image_format.dart';
import 'dart:io';
import 'package:cryptography/cryptography.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class CloudMedia {
  CloudMedia(this.client, this.userId);
  final SupabaseClient client;
  final String userId;
  Future<Map<String, dynamic>> upload(Map<String, dynamic> payload) async {
    for (final pair in [
      ('entries', 'receiptPath'),
      ('keepsakes', 'photoPath'),
    ]) {
      for (final item in payload[pair.$1] as List) {
        final path = item[pair.$2] as String?;
        if (path == null) continue;
        if (path.startsWith('remote:')) {
          if (!path.startsWith('remote:$userId/')) {
            throw StateError('Invalid media owner');
          }
          continue;
        }
        final file = File(path);
        final documents = await getApplicationDocumentsDirectory();
        final resolved = await file.resolveSymbolicLinks();
        if (!resolved.startsWith(
              '${documents.path}${Platform.pathSeparator}',
            ) &&
            !resolved.startsWith('${documents.path}/')) {
          throw StateError('Invalid media path');
        }
        final bytes = await file.readAsBytes();
        if (bytes.length > 10485760) throw StateError('Ảnh vượt quá 10 MB.');
        final digest = await Sha256().hash(bytes);
        final name = digest.bytes
            .map((b) => b.toRadixString(16).padLeft(2, '0'))
            .join();
        final ext = imageExtension(bytes);
        final key = '$userId/$name.$ext';
        await client.storage
            .from('picket-media')
            .uploadBinary(
              key,
              bytes,
              fileOptions: FileOptions(
                upsert: true,
                contentType: ext == 'jpg' ? 'image/jpeg' : 'image/$ext',
              ),
            );
        item[pair.$2] = 'remote:$key';
      }
    }
    return payload;
  }

  Future<Map<String, dynamic>> download(Map<String, dynamic> payload) async {
    final documents = await getApplicationDocumentsDirectory();
    final directory = await Directory(
      '${documents.path}/picket_photos/$userId',
    ).create(recursive: true);
    for (final pair in [
      ('entries', 'receiptPath'),
      ('keepsakes', 'photoPath'),
    ]) {
      for (final item in payload[pair.$1] as List) {
        final path = item[pair.$2] as String?;
        if (path == null) continue;
        if (!path.startsWith('remote:$userId/') || path.contains('..')) {
          throw StateError('Invalid remote media');
        }
        final key = path.substring(7);
        final file = File('${directory.path}/${key.split('/').last}');
        if (!await file.exists()) {
          await file.writeAsBytes(
            await client.storage
                .from('picket-media')
                .download(key)
                .timeout(const Duration(seconds: 30)),
            flush: true,
          );
        }
        item[pair.$2] = file.path;
      }
    }
    return payload;
  }
}
