import 'dart:io';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';

class PhotoStorage {
  final ImagePicker _picker = ImagePicker();
  Future<String?> pick(ImageSource source) async {
    final photo = await _picker.pickImage(
      source: source,
      maxWidth: 1800,
      imageQuality: 85,
    );
    return photo == null ? null : _persist(photo);
  }

  Future<String?> recover() async {
    final result = await _picker.retrieveLostData();
    if (result.exception != null) throw result.exception!;
    final files = result.files;
    return files == null || files.isEmpty ? null : _persist(files.first);
  }

  Future<String> _persist(XFile photo) async {
    final documents = await getApplicationDocumentsDirectory();
    final directory = await Directory(
      '${documents.path}/picket_photos',
    ).create(recursive: true);
    final extension = photo.path.split('.').last.toLowerCase();
    final safeExtension =
        ['jpg', 'jpeg', 'png', 'webp', 'heic'].contains(extension)
        ? extension
        : 'jpg';
    final target =
        '${directory.path}/${DateTime.now().microsecondsSinceEpoch}.$safeExtension';
    await photo.saveTo(target);
    return target;
  }
}
