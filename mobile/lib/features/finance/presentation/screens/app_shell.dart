import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/media/photo_storage.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../capture/presentation/screens/capture_screen.dart';
import '../../domain/entities/finance_data.dart';
import '../state/finance_controller.dart';
import 'home_screen.dart';
import 'transactions_screen.dart';
import 'budgets_screen.dart';
import 'bills_screen.dart';
import 'profile_screen.dart';
import 'entry_form_screen.dart';
import 'keepsake_form_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => recoverPhoto());
  }

  Future<void> recoverPhoto() async {
    if (!Platform.isAndroid) return;
    try {
      final path = await PhotoStorage().recover();
      if (path != null && mounted) {
        open(CaptureScreen(controller: widget.controller, recoveredPath: path));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Không khôi phục được ảnh vừa chọn. Bạn có thể chọn lại trong Camera.',
            ),
          ),
        );
      }
    }
  }

  void open(Widget page) =>
      Navigator.push(context, MaterialPageRoute<void>(builder: (_) => page));
  void add() => showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Bạn muốn ghi lại điều gì?',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
            for (final action in [
              (
                Icons.camera_alt_outlined,
                'Chụp hoá đơn / món đồ',
                () => open(CaptureScreen(controller: widget.controller)),
              ),
              (
                Icons.remove_circle_outline,
                'Khoản chi',
                () => open(EntryFormScreen(controller: widget.controller)),
              ),
              (
                Icons.add_circle_outline,
                'Khoản thu',
                () => open(
                  EntryFormScreen(
                    controller: widget.controller,
                    initialType: EntryType.income,
                  ),
                ),
              ),
              (
                Icons.swap_horiz,
                'Chuyển tiền giữa các ví',
                () => open(
                  EntryFormScreen(
                    controller: widget.controller,
                    initialType: EntryType.transfer,
                  ),
                ),
              ),
              (
                Icons.photo_album_outlined,
                'Thêm món đồ vào bộ sưu tập',
                () => open(KeepsakeFormScreen(controller: widget.controller)),
              ),
            ])
              ListTile(
                leading: Icon(action.$1, color: PicketColors.mauve),
                title: Text(action.$2),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {
                  Navigator.pop(sheetContext);
                  action.$3();
                },
              ),
          ],
        ),
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text(
        'picket.',
        style: TextStyle(
          fontSize: 29,
          fontWeight: FontWeight.w800,
          letterSpacing: -1.5,
        ),
      ),
      actions: [
        IconButton(
          tooltip: 'Tìm giao dịch',
          onPressed: () => setState(() => index = 1),
          icon: const Icon(Icons.search),
        ),
        IconButton(
          tooltip: 'Hồ sơ và cài đặt',
          onPressed: () => open(ProfileScreen(controller: widget.controller)),
          icon: const Icon(Icons.person_outline),
        ),
        const SizedBox(width: 8),
      ],
    ),
    body: SafeArea(
      bottom: false,
      child: IndexedStack(
        index: index,
        children: [
          HomeScreen(
            controller: widget.controller,
            onTransactions: () => setState(() => index = 1),
            onAdd: () => open(EntryFormScreen(controller: widget.controller)),
          ),
          TransactionsScreen(controller: widget.controller),
          BudgetsScreen(controller: widget.controller),
          BillsScreen(controller: widget.controller),
        ],
      ),
    ),
    floatingActionButton: FloatingActionButton(
      backgroundColor: PicketColors.mauve,
      foregroundColor: Colors.white,
      tooltip: 'Thêm nhanh',
      onPressed: add,
      child: const Icon(Icons.camera_alt_outlined),
    ),
    floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    bottomNavigationBar: BottomAppBar(
      color: Colors.white,
      shape: const CircularNotchedRectangle(),
      notchMargin: 8,
      padding: const EdgeInsets.symmetric(horizontal: 6),
      height: 74,
      child: Row(
        children: [
          _nav(0, Icons.home_outlined, 'Trang chủ'),
          _nav(1, Icons.swap_horiz, 'Giao dịch'),
          const SizedBox(width: 68),
          _nav(2, Icons.account_balance_wallet_outlined, 'Ngân sách'),
          _nav(3, Icons.calendar_month_outlined, 'Hoá đơn'),
        ],
      ),
    ),
  );
  Widget _nav(int target, IconData icon, String label) => Expanded(
    child: Semantics(
      selected: index == target,
      button: true,
      label: label,
      child: InkWell(
        onTap: () => setState(() => index = target),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: index == target
                    ? PicketColors.mauve
                    : PicketColors.muted,
              ),
              const SizedBox(height: 6),
              Text(
                label,
                maxLines: 1,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: index == target
                      ? FontWeight.bold
                      : FontWeight.normal,
                  color: index == target
                      ? PicketColors.mauve
                      : PicketColors.muted,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
