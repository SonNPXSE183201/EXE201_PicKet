import 'transactions_screen.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';
import 'amount_editor_screen.dart';
import 'planning_tools_screen.dart';

class BudgetsScreen extends StatefulWidget {
  const BudgetsScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends State<BudgetsScreen> {
  DateTime month = DateTime(DateTime.now().year, DateTime.now().month);
  void edit([Budget? budget]) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => AmountEditorScreen(
        heading: budget == null ? 'Tạo ngân sách' : 'Sửa ngân sách',
        categoryMode: true,
        categoryOptions: allCategories(widget.controller.data),
        initialName: budget?.category ?? '',
        initialAmount: budget?.limit ?? 0,
        amountLabel: 'Hạn mức mỗi tháng',
        help:
            'Ngân sách lặp lại mỗi tháng. Chi tiêu được tính từ giao dịch thuộc danh mục đã chọn.',
        onSave: (category, amount, _) => widget.controller.update(
          (data) => widget.controller.actions.upsertBudget(
            data,
            Budget(
              id: budget?.id ?? newId(),
              category: category,
              limit: amount,
              alertPercent: budget?.alertPercent ?? 80,
              monthLimits: budget?.monthLimits ?? const {},
            ),
          ),
        ),
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(20),
    children: [
      const Text(
        'Chi tiêu có khoảng thở',
        style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 8),
      const Text('Dành chỗ cho những điều quan trọng.'),
      TextButton.icon(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute<void>(
            builder: (_) => PlanningToolsScreen(controller: widget.controller),
          ),
        ),
        icon: const Icon(Icons.tune),
        label: const Text('Chuyển hạn mức · Chốt kỳ · Cảnh báo'),
      ),
      const SizedBox(height: 16),
      Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            tooltip: 'Tháng trước',
            onPressed: () =>
                setState(() => month = DateTime(month.year, month.month - 1)),
            icon: const Icon(Icons.chevron_left),
          ),
          Text(
            'Tháng ${month.month}/${month.year}',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          IconButton(
            tooltip: 'Tháng sau',
            onPressed: () =>
                setState(() => month = DateTime(month.year, month.month + 1)),
            icon: const Icon(Icons.chevron_right),
          ),
        ],
      ),
      const SizedBox(height: 12),
      if (widget.controller.data.budgets.isEmpty)
        const EmptyState(
          title: 'Một kế hoạch nhỏ, bớt lo hơn',
          description:
              'Đặt hạn mức đầu tiên để theo dõi chi tiêu theo danh mục.',
          icon: Icons.donut_large,
        ),
      for (final budget in widget.controller.data.budgets) _budgetCard(budget),
      const SizedBox(height: 16),
      OutlinedButton.icon(
        onPressed: () => edit(),
        icon: const Icon(Icons.add),
        label: const Text('Thêm ngân sách'),
      ),
      const SizedBox(height: 90),
    ],
  );
  Widget _budgetCard(Budget budget) {
    final spent = budgetSpent(widget.controller.data, budget, month);
    final limit = budget.limitAt(month);
    final ratio = limit > 0
        ? (spent / limit).clamp(0.0, 1.0)
        : (spent > 0 ? 1.0 : 0.0);
    final over = spent > limit;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Surface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: PicketColors.cream,
                  child: Icon(
                    categoryIcon(budget.category),
                    color: PicketColors.ink,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    budget.category,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                PopupMenuButton<String>(
                  tooltip: 'Tuỳ chọn ngân sách',
                  onSelected: (value) async {
                    if (value == 'edit') {
                      edit(budget);
                    } else if (await confirmDelete(
                      context,
                      'Giao dịch trong danh mục vẫn được giữ lại.',
                    )) {
                      if (mounted) {
                        await performSave(
                          context,
                          () => widget.controller.update(
                            (data) => data.copyWith(
                              budgets: data.budgets
                                  .where((b) => b.id != budget.id)
                                  .toList(),
                            ),
                          ),
                        );
                      }
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'edit', child: Text('Chỉnh sửa')),
                    PopupMenuItem(value: 'delete', child: Text('Xoá')),
                  ],
                ),
              ],
            ),
            TextButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: Text(budget.category)),
                    body: TransactionsScreen(
                      controller: widget.controller,
                      category: budget.category,
                      month: month,
                    ),
                  ),
                ),
              ),
              child: const Text('Xem giao dịch trong ngân sách'),
            ),
            const SizedBox(height: 20),
            Text(
              money(spent),
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
            ),
            Text(
              'trên ${money(limit)}',
              style: const TextStyle(color: PicketColors.muted),
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: LinearProgressIndicator(
                value: ratio,
                minHeight: 8,
                color: over ? PicketColors.expense : PicketColors.mauve,
                backgroundColor: PicketColors.cream,
                semanticsLabel:
                    'Đã dùng ${(ratio * 100).round()} phần trăm ngân sách',
              ),
            ),
            const SizedBox(height: 12),
            Text(
              over
                  ? 'Vượt ${money(spent - limit)}'
                  : 'Còn ${money(limit - spent)} cho tháng này',
              style: TextStyle(
                color: over ? PicketColors.expense : PicketColors.income,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
