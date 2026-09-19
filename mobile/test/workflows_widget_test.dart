import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/theme/picket_theme.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:mobile/features/finance/domain/usecases/finance_actions.dart';
import 'package:mobile/features/finance/presentation/state/finance_controller.dart';
import 'package:mobile/features/finance/presentation/screens/activity_tools_screen.dart';
import 'package:mobile/features/finance/presentation/screens/planning_tools_screen.dart';
import 'package:mobile/features/finance/presentation/screens/reconcile_screen.dart';
import 'package:mobile/features/finance/presentation/screens/split_entry_screen.dart';
import 'package:mobile/features/finance/presentation/screens/subscriptions_screen.dart';
import 'package:mobile/features/finance/presentation/screens/keepsakes_screen.dart';
import 'package:mobile/features/finance/presentation/screens/profile_screen.dart';
import 'package:mobile/features/settings/presentation/backup_screen.dart';
import 'package:mobile/features/settings/presentation/security_settings_screen.dart';
import 'package:mobile/features/settings/presentation/notifications_screen.dart';
import 'finance_test.dart' show MemoryRepository;

void main() {
  testWidgets('Expanded workflows fit a small screen with enlarged text', (
    tester,
  ) async {
    FlutterSecureStorage.setMockInitialValues({});
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final now = DateTime.now();
    final entry = Entry(
      id: 'e',
      title: 'Bữa trưa',
      amount: 100000,
      type: EntryType.expense,
      walletId: 'w',
      category: 'Ăn uống',
      date: now,
    );
    final repository = MemoryRepository()
      ..value = FinanceData(
        onboarded: true,
        name: 'An',
        wallets: const [
          Wallet(id: 'w', name: 'Tiền mặt', openingBalance: 1000000),
        ],
        entries: [entry],
        budgets: const [Budget(id: 'b', category: 'Ăn uống', limit: 200000)],
        subscriptions: [
          SubscriptionPlan(
            id: 's',
            name: 'Âm nhạc',
            amount: 50000,
            nextDate: now,
          ),
        ],
        keepsakes: [
          Keepsake(id: 'k', title: 'Tai nghe', amount: 100000, date: now),
        ],
      );
    final controller = FinanceController(FinanceActions(repository));
    await controller.load();
    final screens = <Widget>[
      PlanningToolsScreen(controller: controller),
      ReconcileScreen(controller: controller),
      SplitEntryScreen(controller: controller, entry: entry),
      SubscriptionsScreen(controller: controller),
      KeepsakesScreen(controller: controller),
      BulkEntriesScreen(controller: controller),
      ReviewInboxScreen(controller: controller),
      CategoriesScreen(controller: controller),
      ProfileScreen(controller: controller),
      BackupScreen(controller: controller),
      NotificationsScreen(controller: controller),
      SecuritySettingsScreen(controller: controller),
    ];
    for (final screen in screens) {
      await tester.pumpWidget(
        MaterialApp(
          key: ValueKey(screen.runtimeType),
          theme: picketTheme(),
          locale: const Locale('vi'),
          supportedLocales: const [Locale('vi')],
          localizationsDelegates: GlobalMaterialLocalizations.delegates,
          home: screen,
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: '${screen.runtimeType}');
    }
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });
}
