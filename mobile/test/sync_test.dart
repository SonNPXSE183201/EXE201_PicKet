import 'dart:async';
import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/core/security/device_cipher.dart';
import 'package:mobile/features/finance/data/datasources/cloud_media.dart';
import 'package:mobile/features/finance/data/repositories_impl/cloud_finance_repository.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class NoMedia extends CloudMedia {
  NoMedia(super.client, super.userId);
  @override
  Future<Map<String, dynamic>> upload(Map<String, dynamic> payload) async =>
      payload;
  @override
  Future<Map<String, dynamic>> download(Map<String, dynamic> payload) async =>
      payload;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    sqfliteFfiInit();
  });
  CloudFinanceRepository repo(SupabaseClient client) => CloudFinanceRepository(
    cipher: DeviceCipher('test'),
    scope: 'test',
    client: client,
    factory: databaseFactoryFfi,
    databasePath: inMemoryDatabasePath,
    media: NoMedia(client, 'test'),
  );
  test(
    'Invalid remote snapshot never replaces the valid local ledger',
    () async {
      final client = SupabaseClient(
        'https://example.test',
        'anon',
        httpClient: MockClient(
          (request) async => http.Response(
            jsonEncode({
              'revision': 2,
              'payload': {
                ...const FinanceData(name: 'broken').toJson(),
                'wallets': [
                  {'id': 'duplicate', 'name': 'A', 'openingBalance': 0},
                  {'id': 'duplicate', 'name': 'B', 'openingBalance': 0},
                ],
              },
            }),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          ),
        ),
      );
      final repository = repo(client);
      try {
        await repository.save(const FinanceData(name: 'safe'));
        await (await repository.database).update('snapshot', {
          'dirty': 0,
          'revision': 1,
        });
        await expectLater(
          repository.synchronize(),
          throwsA(isA<FormatException>()),
        );
        expect((await repository.load()).name, 'safe');
        expect(
          (await (await repository.database).query(
            'snapshot',
          )).single['revision'],
          1,
        );
      } finally {
        await repository.close();
        await client.dispose();
      }
    },
  );
  test(
    'Saving while upload is in flight preserves new generation for next sync',
    () async {
      final sent = Completer<void>(), release = Completer<void>();
      var calls = 0;
      final client = SupabaseClient(
        'https://example.test',
        'anon',
        httpClient: MockClient((request) async {
          calls++;
          if (calls == 1) {
            sent.complete();
            await release.future;
          }
          return http.Response(
            '$calls',
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      final repository = repo(client);
      try {
        await repository.save(const FinanceData(name: 'first'));
        final sync = repository.synchronize();
        await sent.future;
        await repository.save(const FinanceData(name: 'second'));
        release.complete();
        await sync;
        final row = (await (await repository.database).query(
          'snapshot',
        )).single;
        expect(row['revision'], 1);
        expect(row['dirty'], 1);
        expect((await repository.load()).name, 'second');
        await repository.synchronize();
        expect(
          (await (await repository.database).query('snapshot')).single['dirty'],
          0,
        );
      } finally {
        await repository.close();
        await client.dispose();
      }
    },
  );
  test(
    'Server conflict retains local ledger and archives it before remote resolution',
    () async {
      final client = SupabaseClient(
        'https://example.test',
        'anon',
        httpClient: MockClient((request) async {
          if (request.method == 'POST') {
            return http.Response(
              jsonEncode({'code': '40001', 'message': 'Snapshot conflict'}),
              409,
              request: request,
              headers: {'content-type': 'application/json'},
            );
          }
          return http.Response(
            jsonEncode({
              'payload': const FinanceData(name: 'remote').toJson(),
              'revision': 4,
            }),
            200,
            request: request,
            headers: {'content-type': 'application/json'},
          );
        }),
      );
      final repository = repo(client);
      try {
        await repository.save(const FinanceData(name: 'local'));
        await expectLater(
          repository.synchronize(),
          throwsA(isA<SyncConflict>()),
        );
        expect((await repository.load()).name, 'local');
        await repository.resolveConflict(keepLocal: false);
        expect((await repository.load()).name, 'remote');
        final history = await (await repository.database).query(
          'conflict_recovery',
        );
        expect(
          (await repository.decode(history.single['payload'] as String)).name,
          'local',
        );
      } finally {
        await repository.close();
        await client.dispose();
      }
    },
  );
}
