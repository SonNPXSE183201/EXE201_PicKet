import 'dart:io';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../finance/data/repositories_impl/cloud_finance_repository.dart';
import '../../finance/domain/entities/finance_data.dart';

class AccountService {
  AccountService(this.client);
  final SupabaseClient client;
  Future<void> delete(
    String password,
    CloudFinanceRepository repository,
    FinanceData data,
  ) async {
    final user = client.auth.currentUser;
    if (user?.email == null) {
      throw ArgumentError('Hãy đăng nhập lại bằng email.');
    }
    await client.auth.signInWithPassword(
      email: user!.email!,
      password: password,
    );
    final response = await client.functions.invoke('delete-account');
    if (response.status != 200 || response.data['deleted'] != true) {
      throw StateError('Account deletion failed');
    }
    final documents = await getApplicationDocumentsDirectory();
    for (final path in {
      ...data.entries.map((e) => e.receiptPath),
      ...data.keepsakes.map((i) => i.photoPath),
    }.whereType<String>()) {
      try {
        final file = File(path);
        if (!await file.exists()) continue;
        final resolved = await file.resolveSymbolicLinks();
        if (resolved.startsWith('${documents.path}${Platform.pathSeparator}') ||
            resolved.startsWith('${documents.path}/')) {
          await file.delete();
        }
      } catch (_) {
        /* Account deletion must still sign out if an unused photo cannot be removed. */
      }
    }
    try {
      try {
        await repository.erase();
      } finally {
        await const FlutterSecureStorage().delete(
          key: 'picket.database.key.${user.id}',
        );
      }
    } finally {
      await client.auth.signOut(scope: SignOutScope.local);
    }
  }
}
