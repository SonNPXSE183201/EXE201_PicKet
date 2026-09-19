import 'package:flutter/foundation.dart';
import 'dart:async';
import '../../../../core/notifications/reminder_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/security/device_cipher.dart';
import '../../data/repositories_impl/sqlite_finance_repository.dart';
import '../../data/repositories_impl/cloud_finance_repository.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';

final financeProvider = Provider<FinanceController>((ref) {
  final repository = SqliteFinanceRepository(
    cipher: DeviceCipher('device'),
    scope: 'device',
  );
  final controller = FinanceController(FinanceActions(repository));
  ref.onDispose(() {
    controller.dispose();
    repository.close();
  });
  return controller;
});

class FinanceController extends ChangeNotifier {
  FinanceController(this.actions);
  final FinanceActions actions;
  FinanceData data = const FinanceData();
  bool loading = true;
  bool saving = false;
  String? loadError;
  bool syncing = false;
  bool hasSyncConflict = false;
  bool _resyncRequested = false;
  bool _disposed = false;
  String? syncMessage;
  bool get cloudEnabled => actions.repository is CloudFinanceRepository;
  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  Future<void> synchronize() async {
    final repository = actions.repository;
    if (repository is! CloudFinanceRepository || saving) return;
    if (syncing) {
      _resyncRequested = true;
      return;
    }
    syncing = true;
    syncMessage = null;
    notifyListeners();
    final previous = data;
    try {
      await repository.synchronize();
      final refreshed = await actions.load();
      if (identical(data, previous) && !saving) data = refreshed;
      hasSyncConflict = false;
      syncMessage = 'Đã đồng bộ với máy chủ.';
    } on SyncConflict {
      hasSyncConflict = true;
      syncMessage =
          'Có thay đổi trên thiết bị khác. Dữ liệu trên máy vẫn được giữ. Xuất bản sao trước khi xử lý xung đột.';
    } catch (_) {
      syncMessage =
          'Chưa đồng bộ được. Thay đổi vẫn lưu trên thiết bị; hãy thử lại khi có mạng.';
    } finally {
      syncing = false;
      notifyListeners();
      if (_resyncRequested && !_disposed) {
        _resyncRequested = false;
        unawaited(synchronize());
      }
    }
  }

  Future<void> resolveConflict(bool keepLocal) async {
    final repository = actions.repository;
    if (repository is! CloudFinanceRepository || saving || syncing) return;
    saving = true;
    notifyListeners();
    try {
      await repository.resolveConflict(keepLocal: keepLocal);
      data = await repository.load();
      hasSyncConflict = false;
    } finally {
      saving = false;
      notifyListeners();
    }
    await synchronize();
  }

  Future<void> load() async {
    loading = true;
    loadError = null;
    notifyListeners();
    try {
      data = await actions.load();
      if (data.onboarded) {
        unawaited(synchronize());
      } else {
        await synchronize();
      }
    } catch (_) {
      loadError =
          'Không đọc được dữ liệu trên thiết bị. Dữ liệu cũ vẫn được giữ lại. Hãy thử lại.';
    }
    loading = false;
    notifyListeners();
  }

  Future<void> runExclusive(Future<void> Function() operation) async {
    if (saving || syncing) {
      throw StateError('Đang xử lý dữ liệu, vui lòng thử lại.');
    }
    saving = true;
    notifyListeners();
    try {
      await operation();
    } finally {
      saving = false;
      notifyListeners();
    }
  }

  Future<void> update(FinanceData Function(FinanceData) change) async {
    if (saving) throw StateError('Đang lưu, vui lòng đợi một chút.');
    saving = true;
    notifyListeners();
    try {
      final next = change(data);
      await actions.save(next);
      data = next;
    } finally {
      saving = false;
      notifyListeners();
    }
    unawaited(synchronize());
    if (actions.repository is SqliteFinanceRepository) {
      try {
        await ReminderService.instance.refresh(data);
      } catch (_) {
        /* OS permission does not roll back a saved transaction. */
      }
    }
  }

  Future<void> saveEntry(Entry entry) =>
      update((data) => actions.upsertEntry(data, entry));
  Future<void> deleteEntry(String id) =>
      update((data) => actions.removeEntry(data, id));
  Future<void> pay(Bill bill, String walletId) =>
      update((data) => actions.payBill(data, bill, walletId));
}
