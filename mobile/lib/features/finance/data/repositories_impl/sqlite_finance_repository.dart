import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import '../../../../core/security/device_cipher.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/repositories/finance_repository.dart';
import '../../domain/usecases/snapshot_validation.dart';

class SqliteFinanceRepository implements FinanceRepository {
  SqliteFinanceRepository({
    required this.cipher,
    required this.scope,
    this.factory,
    this.databasePath,
  });
  final PayloadCipher cipher;
  final String scope;
  final DatabaseFactory? factory;
  final String? databasePath;
  Future<Database>? _database;
  Future<Database> get database => _database ??= _openRetryable();
  Future<Database> _openRetryable() async {
    try {
      return await _open();
    } catch (_) {
      _database = null;
      rethrow;
    }
  }

  Future<Database> _open() async {
    final path = databasePath ?? '${await getDatabasesPath()}/picket_$scope.db';
    return (factory ?? databaseFactory).openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 1,
        onConfigure: (db) async {
          // Android requires result-returning PRAGMAs to use the query API.
          await db.rawQuery('PRAGMA journal_mode=WAL');
        },
        onCreate: (db, _) async {
          await db.execute(
            'CREATE TABLE snapshot (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL, generation INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 0, dirty INTEGER NOT NULL DEFAULT 0)',
          );
        },
      ),
    );
  }

  @override
  Future<FinanceData> load() async {
    final db = await database;
    final rows = await db.query('snapshot', where: 'id = 1');
    if (rows.isNotEmpty) return decode(rows.single['payload'] as String);
    // Guest data is never silently imported into a signed-in account.
    if (scope == 'device' && databasePath == null) {
      final preferences = SharedPreferencesAsync();
      final old = await preferences.getString('picket.finance.v1');
      if (old != null) {
        final data = FinanceData.fromJson(
          jsonDecode(old) as Map<String, dynamic>,
        );
        await save(data);
        await preferences.remove('picket.finance.v1');
        return data;
      }
    }
    return const FinanceData();
  }

  Future<FinanceData> decode(String value) async => FinanceData.fromJson(
    jsonDecode(await cipher.decrypt(value)) as Map<String, dynamic>,
  );
  Future<String> encode(FinanceData data) {
    validateSnapshot(data);
    return cipher.encrypt(jsonEncode(data.toJson()));
  }

  @override
  Future<void> save(FinanceData data) async {
    final payload = await encode(data);
    final db = await database;
    await db.transaction((txn) async {
      await txn.rawInsert(
        'INSERT INTO snapshot(id,payload,generation,revision,dirty) VALUES(1,?,1,0,1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,generation=snapshot.generation+1,dirty=1',
        [payload],
      );
    });
  }

  Future<void> erase() async {
    await close();
    final path = databasePath ?? '${await getDatabasesPath()}/picket_$scope.db';
    await (factory ?? databaseFactory).deleteDatabase(path);
    _database = null;
  }

  Future<void> close() async {
    final database = _database;
    _database = null;
    if (database != null) await (await database).close();
  }
}
