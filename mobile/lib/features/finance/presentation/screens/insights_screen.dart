import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class InsightsScreen extends StatefulWidget {
  const InsightsScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<InsightsScreen> createState() => _InsightsScreenState();
}

class _InsightsScreenState extends State<InsightsScreen> {
  DateTime month = DateTime(DateTime.now().year, DateTime.now().month);
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Thống kê')),
    body: ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final data = widget.controller.data;
        final income = monthlyTotal(data, EntryType.income, month);
        final expense = monthlyTotal(data, EntryType.expense, month);
        final totals = <String, int>{};
        for (final category in allCategories(data)) {
          final amount = budgetSpent(
            data,
            Budget(id: category, category: category, limit: 1),
            month,
          );
          if (amount != 0) totals[category] = amount;
        }
        final sorted = totals.entries.toList()
          ..sort((a, b) => b.value.compareTo(a.value));
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text(
              'Hiểu tiền của mình',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  tooltip: 'Tháng trước',
                  onPressed: () => setState(
                    () => month = DateTime(month.year, month.month - 1),
                  ),
                  icon: const Icon(Icons.chevron_left),
                ),
                Text('Tháng ${month.month}/${month.year}'),
                IconButton(
                  tooltip: 'Tháng sau',
                  onPressed: () => setState(
                    () => month = DateTime(month.year, month.month + 1),
                  ),
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Surface(
              color: PicketColors.peach,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Chênh lệch thu − chi'),
                  const SizedBox(height: 12),
                  Text(
                    money(income - expense),
                    style: const TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Thu nhập: ${money(income)}'),
                  const SizedBox(height: 8),
                  Text('Chi tiêu: ${money(expense)}'),
                ],
              ),
            ),
            const SectionTitle('Bạn đã chi cho điều gì?'),
            if (sorted.isEmpty)
              const EmptyState(
                title: 'Chưa có chi tiêu trong tháng',
                description: 'Biểu đồ sẽ xuất hiện khi bạn ghi giao dịch.',
                icon: Icons.bar_chart,
              ),
            for (final total in sorted)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Surface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(categoryIcon(total.key), size: 20),
                          const SizedBox(width: 10),
                          Expanded(child: Text(total.key)),
                          Text(
                            money(total.value),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      LinearProgressIndicator(
                        value: expense > 0
                            ? (total.value / expense).clamp(0.0, 1.0)
                            : 0,
                        minHeight: 8,
                        borderRadius: BorderRadius.circular(8),
                        backgroundColor: PicketColors.cream,
                        semanticsLabel:
                            '${total.key}: ${money(total.value)}, ${(expense > 0 ? 100 * total.value / expense : 0).round()} phần trăm',
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${(expense > 0 ? 100 * total.value / expense : 0).round()}% tổng chi',
                        style: const TextStyle(
                          fontSize: 12,
                          color: PicketColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
            const Text(
              'Số liệu tính từ giao dịch đã lưu theo tháng. Chuyển tiền giữa các ví không tính vào thu nhập hoặc chi tiêu.',
              style: TextStyle(color: PicketColors.muted, height: 1.5),
            ),
          ],
        );
      },
    ),
  );
}
