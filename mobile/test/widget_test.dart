import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:mobile/features/finance/domain/usecases/finance_actions.dart';
import 'package:mobile/features/finance/presentation/state/finance_controller.dart';
import 'finance_test.dart' show MemoryRepository;

void main() {
  setUp(() {
    final handler = FlutterError.onError;
    FlutterError.onError = (details) {
      FlutterError.dumpErrorToConsole(details);
      handler?.call(details);
    };
  });
  testWidgets('Onboarding creates a wallet and opens the real home screen', (
    tester,
  ) async {
    final repo = MemoryRepository();
    final controller = FinanceController(FinanceActions(repo));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [financeProvider.overrideWithValue(controller)],
        child: const PicketApp(),
      ),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), 'An');
    await tester.enterText(find.byType(TextFormField).at(2), '1000000');
    await tester.ensureVisible(find.text('Bắt đầu cùng Picket'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bắt đầu cùng Picket'));
    await tester.pumpAndSettle();
    expect(find.text('Chào An,'), findsOneWidget);
    expect(repo.value.wallets.single.openingBalance, 1000000);
    expect(tester.takeException(), isNull);
  });
  testWidgets('Navigation and entry form fit a 360px Android screen', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    final previousError = FlutterError.onError;
    FlutterError.onError = (details) {
      debugPrint(details.toString());
      previousError?.call(details);
    };
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final repo = MemoryRepository()
      ..value = const FinanceData(
        onboarded: true,
        name: 'An',
        wallets: [Wallet(id: 'w', name: 'Tiền mặt', openingBalance: 1000000)],
      );
    final controller = FinanceController(FinanceActions(repo));
    await tester.pumpWidget(
      ProviderScope(
        overrides: [financeProvider.overrideWithValue(controller)],
        child: const PicketApp(),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Giao dịch').last);
    await tester.pumpAndSettle();
    expect(find.text('Dòng tiền của bạn'), findsOneWidget);
    await tester.ensureVisible(find.text('Thêm giao dịch'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Thêm giao dịch'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(0), '45000');
    await tester.enterText(find.byType(TextFormField).at(1), 'Cà phê sáng');
    await tester.ensureVisible(find.text('Lưu giao dịch'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Lưu giao dịch'));
    await tester.pumpAndSettle();
    expect(repo.value.entries.single.amount, 45000);
    expect(find.text('Cà phê sáng'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
