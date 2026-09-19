import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/core/security/device_cipher.dart';
import 'package:mobile/features/finance/data/repositories_impl/sqlite_finance_repository.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'SQLite persists authenticated ciphertext across repository restarts',
    () async {
      FlutterSecureStorage.setMockInitialValues({});
      sqfliteFfiInit();
      final dir = await Directory.systemTemp.createTemp('picket_test_');
      final path = '${dir.path}/ledger.db';
      final cipher = DeviceCipher('test');
      final repo = SqliteFinanceRepository(
        cipher: cipher,
        scope: 'test',
        factory: databaseFactoryFfi,
        databasePath: path,
      );
      const data = FinanceData(
        name: 'PRIVATE NAME',
        wallets: [Wallet(id: 'w', name: 'Private wallet', openingBalance: 100)],
      );
      try {
        await repo.save(data);
        final rows = await (await repo.database).query('snapshot');
        expect(
          rows.single['payload'].toString(),
          isNot(contains('PRIVATE NAME')),
        );
        expect(rows.single['dirty'], 1);
        await repo.close();
        // Closing a scope must not leave a cached, closed database handle.
        expect((await repo.load()).name, data.name);
        await repo.close();
        final restarted = SqliteFinanceRepository(
          cipher: DeviceCipher('test'),
          scope: 'test',
          factory: databaseFactoryFfi,
          databasePath: path,
        );
        try {
          expect((await restarted.load()).name, data.name);
        } finally {
          await restarted.close();
        }
        final encrypted = await cipher.encrypt('secret');
        expect(await cipher.decrypt(encrypted), 'secret');
        expect(
          () => DeviceCipher('other').decrypt(encrypted),
          throwsA(anything),
        );
      } finally {
        await repo.close();
        await dir.delete(recursive: true);
      }
    },
  );
}
