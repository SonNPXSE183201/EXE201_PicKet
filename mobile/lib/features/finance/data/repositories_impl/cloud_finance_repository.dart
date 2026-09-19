import 'package:sqflite/sqflite.dart';
import '../datasources/cloud_media.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/finance_data.dart';
import 'sqlite_finance_repository.dart';

class SyncConflict implements Exception {}

class CloudFinanceRepository extends SqliteFinanceRepository {
  CloudFinanceRepository({
    required super.cipher,
    required super.scope,
    required this.client,
    super.factory,
    super.databasePath,
    this.media,
  });
  final SupabaseClient client;
  final CloudMedia? media;
  CloudMedia get cloudMedia => media ?? CloudMedia(client, scope);
  bool _syncing = false;

  /// Keep an encrypted recovery copy before accepting either conflict choice.
  Future<void> resolveConflict({required bool keepLocal}) async {
    if (_syncing) throw StateError('Sync is running');
    _syncing = true;
    try {
      final remote = await client
          .from('finance_snapshots')
          .select('payload,revision')
          .eq('user_id', scope)
          .maybeSingle()
          .timeout(const Duration(seconds: 20));
      if (remote == null) throw StateError('Remote snapshot unavailable');
      final db = await database;
      final remotePayload = keepLocal
          ? null
          : await encode(
              FinanceData.fromJson(
                await cloudMedia.download(
                  Map<String, dynamic>.from(remote['payload'] as Map),
                ),
              ),
            );
      await db.transaction((txn) async {
        await txn.execute(
          'CREATE TABLE IF NOT EXISTS conflict_recovery (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, created_at TEXT NOT NULL)',
        );
        final rows = await txn.query('snapshot', where: 'id=1');
        if (rows.isEmpty) throw StateError('Local snapshot unavailable');
        await txn.insert('conflict_recovery', {
          'payload': rows.single['payload'],
          'created_at': DateTime.now().toIso8601String(),
        });
        await txn.update('snapshot', {
          'payload': ?remotePayload,
          'revision': remote['revision'],
          'dirty': keepLocal ? 1 : 0,
          'generation': (rows.single['generation'] as int) + 1,
        }, where: 'id=1');
      });
    } finally {
      _syncing = false;
    }
  }

  Future<void> synchronize() async {
    if (_syncing) return;
    _syncing = true;
    try {
      final db = await database;
      final rows = await db.query('snapshot', where: 'id = 1');
      final local = rows.firstOrNull;
      if (local != null && local['dirty'] == 1) {
        final data = await decode(local['payload'] as String);
        final payload = await cloudMedia.upload(data.toJson());
        final revision = await client
            .rpc(
              'save_finance_snapshot',
              params: {
                'expected_revision': local['revision'],
                'new_payload': payload,
              },
            )
            .timeout(const Duration(seconds: 20));
        await db.transaction((txn) async {
          await txn.rawUpdate(
            'UPDATE snapshot SET revision=?, dirty=CASE WHEN generation=? THEN 0 ELSE 1 END WHERE id=1',
            [revision, local['generation']],
          );
        });
      } else {
        final head = await client
            .from('finance_snapshots')
            .select('revision')
            .eq('user_id', scope)
            .maybeSingle()
            .timeout(const Duration(seconds: 20));
        if (head == null || head['revision'] == local?['revision']) return;
        final remote = await client
            .from('finance_snapshots')
            .select('payload,revision')
            .eq('user_id', scope)
            .maybeSingle()
            .timeout(const Duration(seconds: 20));
        if (remote == null) return;
        final remoteData = await cloudMedia.download(
          Map<String, dynamic>.from(remote['payload'] as Map),
        );
        final payload = await encode(FinanceData.fromJson(remoteData));
        await db.transaction((txn) async {
          final current = await txn.query('snapshot', where: 'id=1');
          if (current.isNotEmpty && current.single['dirty'] == 1) return;
          await txn.insert('snapshot', {
            'id': 1,
            'payload': payload,
            'revision': remote['revision'],
            'generation': local?['generation'] ?? 0,
            'dirty': 0,
          }, conflictAlgorithm: ConflictAlgorithm.replace);
        });
      }
    } on PostgrestException catch (error) {
      if (error.code == '40001') throw SyncConflict();
      rethrow;
    } finally {
      _syncing = false;
    }
  }
}
