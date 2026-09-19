import '../../../partners/presentation/partner_notice.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';
import '../widgets/entry_tile.dart';
import 'entry_detail_screen.dart';
import 'wallets_screen.dart';
import 'keepsakes_screen.dart';
import 'insights_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({
    super.key,
    required this.controller,
    required this.onTransactions,
    required this.onAdd,
  });
  final FinanceController controller;
  final VoidCallback onTransactions, onAdd;
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DateTime month = DateTime(DateTime.now().year, DateTime.now().month);
  DateTime? selectedDate;
  void open(Widget screen) =>
      Navigator.push(context, MaterialPageRoute<void>(builder: (_) => screen));
  @override
  Widget build(BuildContext context) {
    final data = widget.controller.data;
    final balance = data.wallets.fold(
      0,
      (sum, w) => sum + walletBalance(data, w),
    );
    final expense = monthlyTotal(data, EntryType.expense, month);
    final income = monthlyTotal(data, EntryType.income, month);
    final recent =
        data.entries
            .where(
              (e) => selectedDate == null
                  ? inMonth(e.date, month)
                  : DateUtils.isSameDay(e.date, selectedDate),
            )
            .toList()
          ..sort((a, b) => b.date.compareTo(a.date));
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 90),
      children: [
        if (widget.controller.cloudEnabled) const PartnerNotice(),
        Text(
          'Chào ${data.name},',
          style: const TextStyle(color: PicketColors.muted, fontSize: 16),
        ),
        const SizedBox(height: 6),
        const Text(
          'Hôm nay, nhẹ ví\nnhưng đầy niềm vui.',
          style: TextStyle(
            fontSize: 29,
            height: 1.2,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.8,
          ),
        ),
        const SizedBox(height: 24),
        Surface(
          color: PicketColors.peach,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'TỔNG SỐ DƯ',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.6,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: data.hideBalance ? 'Hiện số dư' : 'Ẩn số dư',
                    onPressed: widget.controller.saving
                        ? null
                        : () => performSave(
                            context,
                            () => widget.controller.update(
                              (d) => d.copyWith(hideBalance: !d.hideBalance),
                            ),
                          ),
                    icon: Icon(
                      data.hideBalance
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      size: 20,
                    ),
                  ),
                ],
              ),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  data.hideBalance ? '••••••••' : money(balance),
                  style: const TextStyle(
                    fontSize: 38,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -1.3,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _total(
                      'Thu tháng ${month.month}',
                      income,
                      true,
                      data.hideBalance,
                    ),
                  ),
                  Expanded(
                    child: _total(
                      'Chi tháng ${month.month}',
                      expense,
                      false,
                      data.hideBalance,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () =>
                    open(WalletsScreen(controller: widget.controller)),
                child: Text('${data.wallets.length} ví của bạn  →'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: _shortcut(Icons.add_rounded, 'Ghi chi tiêu', widget.onAdd),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _shortcut(
                Icons.photo_album_outlined,
                'Bộ sưu tập',
                () => open(KeepsakesScreen(controller: widget.controller)),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _shortcut(
                Icons.bar_chart_rounded,
                'Thống kê',
                () => open(InsightsScreen(controller: widget.controller)),
              ),
            ),
          ],
        ),
        const SectionTitle('Nhật ký tháng này'),
        Surface(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    tooltip: 'Tháng trước',
                    onPressed: () => setState(() {
                      month = DateTime(month.year, month.month - 1);
                      selectedDate = null;
                    }),
                    icon: const Icon(Icons.chevron_left),
                  ),
                  Expanded(
                    child: Text(
                      'Tháng ${month.month}, ${month.year}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                  IconButton(
                    tooltip: 'Tháng sau',
                    onPressed: () => setState(() {
                      month = DateTime(month.year, month.month + 1);
                      selectedDate = null;
                    }),
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  for (final day in ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])
                    Expanded(
                      child: Center(
                        child: Text(
                          day,
                          style: const TextStyle(
                            color: PicketColors.muted,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              _calendar(data),
            ],
          ),
        ),
        SectionTitle(
          selectedDate == null
              ? 'Giao dịch gần đây'
              : 'Ngày ${shortDate(selectedDate!)}',
          action: selectedDate == null ? 'Tất cả' : 'Bỏ lọc',
          onTap: selectedDate == null
              ? widget.onTransactions
              : () => setState(() => selectedDate = null),
        ),
        if (recent.isEmpty)
          EmptyState(
            title: 'Một trang nhật ký mới',
            description:
                'Ghi lại khoản thu hoặc chi để bắt đầu câu chuyện của bạn.',
            action: 'Ghi giao dịch đầu tiên',
            onAction: widget.onAdd,
          )
        else
          Card(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Column(
                children: recent
                    .take(5)
                    .map(
                      (e) => EntryTile(
                        entry: e,
                        onTap: () => open(
                          EntryDetailScreen(
                            controller: widget.controller,
                            id: e.id,
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ),
      ],
    );
  }

  Widget _total(String label, int amount, bool income, bool hidden) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(fontSize: 12)),
      const SizedBox(height: 6),
      FittedBox(
        child: Text(
          hidden ? '••••••' : money(amount),
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.bold,
            color: income ? PicketColors.income : PicketColors.expense,
          ),
        ),
      ),
    ],
  );
  Widget _shortcut(IconData icon, String label, VoidCallback action) =>
      Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: action,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 4),
            child: Column(
              children: [
                Icon(icon, color: PicketColors.mauve, size: 26),
                const SizedBox(height: 10),
                Text(
                  label,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
  Widget _calendar(FinanceData data) {
    final leading = month.weekday - 1;
    final days = DateUtils.getDaysInMonth(month.year, month.month);
    final count = ((leading + days) / 7).ceil() * 7;
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: count,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 7,
        mainAxisExtent: 48,
      ),
      itemBuilder: (context, index) {
        final day = index - leading + 1;
        if (day < 1 || day > days) return const SizedBox.shrink();
        final date = DateTime(month.year, month.month, day);
        final hasEntry = data.entries.any(
          (e) => DateUtils.isSameDay(e.date, date),
        );
        final selected = DateUtils.isSameDay(date, selectedDate);
        final today = DateUtils.isSameDay(date, DateTime.now());
        return Semantics(
          label: '${shortDate(date)}${hasEntry ? ', có giao dịch' : ''}',
          selected: selected,
          button: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: () => setState(() => selectedDate = selected ? null : date),
            child: Container(
              margin: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: selected
                    ? PicketColors.mauve
                    : today
                    ? PicketColors.peach
                    : null,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$day',
                    style: TextStyle(
                      color: selected ? Colors.white : PicketColors.ink,
                      fontWeight: today || selected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Container(
                    width: 4,
                    height: 4,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: hasEntry
                          ? (selected ? Colors.white : PicketColors.mauve)
                          : Colors.transparent,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
