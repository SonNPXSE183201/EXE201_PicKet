import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:mobile/features/finance/domain/usecases/finance_actions.dart';
import 'package:mobile/features/finance/presentation/state/finance_controller.dart';
import 'finance_test.dart' show MemoryRepository;

void main() {
  testWidgets('Populated tabs remain usable with enlarged text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue =
        Platform.environment.containsKey('PICKET_PREVIEW_DIR') ? 1 : 1.3;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final previous = FlutterError.onError;
    FlutterError.onError = (details) {
      debugPrint(details.toString());
      previous?.call(details);
    };
    final now = DateTime.now();
    final repo = MemoryRepository()
      ..value = FinanceData(
        onboarded: true,
        name: 'Minh Anh',
        wallets: const [
          Wallet(id: 'cash', name: 'Tiền mặt', openingBalance: 2500000),
        ],
        entries: [
          Entry(
            id: 'one',
            title: 'Cà phê cùng bạn',
            amount: 65000,
            type: EntryType.expense,
            walletId: 'cash',
            category: 'Ăn uống',
            date: now,
          ),
        ],
        budgets: const [
          Budget(id: 'food', category: 'Ăn uống', limit: 1500000),
        ],
        bills: [
          Bill(id: 'internet', title: 'Internet', amount: 220000, dueDate: now),
        ],
      );
    final controller = FinanceController(FinanceActions(repo));
    final previewDir = Platform.environment['PICKET_PREVIEW_DIR'];
    final fontPath = Platform.environment['PICKET_PREVIEW_FONT'];
    if (previewDir != null && fontPath != null) {
      await tester.runAsync(() async {
        final font = FontLoader('Roboto')
          ..addFont(
            Future.value(
              ByteData.sublistView(await File(fontPath).readAsBytes()),
            ),
          );
        await font.load();
        final icons = FontLoader('MaterialIcons')
          ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
        await icons.load();
      });
      debugDisableShadows = false;
    }
    final boundaryKey = GlobalKey();
    await tester.pumpWidget(
      RepaintBoundary(
        key: boundaryKey,
        child: ProviderScope(
          overrides: [financeProvider.overrideWithValue(controller)],
          child: const PicketApp(),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    for (final tab in ['Trang chủ', 'Giao dịch', 'Ngân sách', 'Hoá đơn']) {
      await tester.tap(find.text(tab).last);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      if (previewDir != null) {
        final boundary =
            boundaryKey.currentContext!.findRenderObject()!
                as RenderRepaintBoundary;
        final name = {
          'Trang chủ': 'home',
          'Giao dịch': 'transactions',
          'Ngân sách': 'budgets',
          'Hoá đơn': 'bills',
        }[tab];
        await tester.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: 2);
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          await Directory(previewDir).create(recursive: true);
          await File(
            '$previewDir/picket-$name.png',
          ).writeAsBytes(bytes!.buffer.asUint8List());
          image.dispose();
        });
      }
    }
    debugDisableShadows = true;
  });
}
