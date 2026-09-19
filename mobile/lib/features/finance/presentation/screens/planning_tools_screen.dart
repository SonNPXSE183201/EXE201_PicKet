import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class PlanningToolsScreen extends StatefulWidget {
  const PlanningToolsScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<PlanningToolsScreen> createState() => _PlanningToolsScreenState();
}

class _PlanningToolsScreenState extends State<PlanningToolsScreen> {
  final amount = TextEditingController(), note = TextEditingController();
  String? source, destination;
  DateTime month = DateTime(DateTime.now().year, DateTime.now().month - 1);
  bool rollover = false, checked = false, busy = false;
  @override
  void dispose() {
    amount.dispose();
    note.dispose();
    super.dispose();
  }

  Future<void> save(Future<void> Function() task) async {
    setState(() => busy = true);
    await performSave(context, task);
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Kế hoạch ngân sách')),
    body: ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final data = widget.controller.data;
        final closed = data.closedMonths
            .where((m) => m.month == monthKey(month))
            .firstOrNull;
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            DropdownButtonFormField<String>(
              initialValue:
                  data.preferences['budgetMethod'] as String? ?? 'Đơn giản',
              decoration: const InputDecoration(
                labelText: 'Phương pháp lập kế hoạch',
              ),
              items: const [
                'Đơn giản',
                'Phong bì',
                'Zero-based',
                '50/30/20',
                'Sự kiện',
              ].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
              onChanged: (value) => save(
                () => widget.controller.update(
                  (data) => data.copyWith(
                    preferences: {...data.preferences, 'budgetMethod': value},
                  ),
                ),
              ),
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Text(
                'Chọn cách tổ chức phù hợp, sau đó đặt hạn mức từng danh mục. Hạn mức và số đã chi luôn tính từ giao dịch thực tế.',
              ),
            ),
            const SectionTitle('Chuyển hạn mức tháng hiện tại'),
            const Text(
              'Điều chuyển phần chưa dùng giữa hai ngân sách; không làm thay đổi số dư ví.',
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: source,
              decoration: const InputDecoration(labelText: 'Từ ngân sách'),
              items: data.budgets
                  .map(
                    (b) =>
                        DropdownMenuItem(value: b.id, child: Text(b.category)),
                  )
                  .toList(),
              onChanged: (v) => setState(() => source = v),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: destination,
              decoration: const InputDecoration(labelText: 'Sang ngân sách'),
              items: data.budgets
                  .map(
                    (b) =>
                        DropdownMenuItem(value: b.id, child: Text(b.category)),
                  )
                  .toList(),
              onChanged: (v) => setState(() => destination = v),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amount,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: const InputDecoration(
                labelText: 'Hạn mức chuyển',
                suffixText: 'VND',
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: busy || source == null || destination == null
                  ? null
                  : () => save(
                      () => widget.controller.update(
                        (d) => widget.controller.actions.transferBudget(
                          d,
                          d.budgets.firstWhere((b) => b.id == source),
                          d.budgets.firstWhere((b) => b.id == destination),
                          int.tryParse(amount.text) ?? 0,
                          DateTime.now(),
                        ),
                      ),
                    ),
              child: const Text('Chuyển hạn mức'),
            ),
            const SectionTitle('Chốt tháng và chuyển phần dư'),
            Row(
              children: [
                IconButton(
                  tooltip: 'Tháng trước',
                  onPressed: () => setState(
                    () => month = DateTime(month.year, month.month - 1),
                  ),
                  icon: const Icon(Icons.chevron_left),
                ),
                Expanded(
                  child: Text(
                    'Tháng ${month.month}/${month.year}',
                    textAlign: TextAlign.center,
                  ),
                ),
                IconButton(
                  tooltip: 'Tháng sau',
                  onPressed: () => setState(
                    () => month = DateTime(month.year, month.month + 1),
                  ),
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
            Text(
              'Thu ${money(monthlyTotal(data, EntryType.income, month))} · Chi ${money(monthlyTotal(data, EntryType.expense, month))}',
            ),
            for (final b in data.budgets)
              ListTile(
                title: Text(b.category),
                subtitle: Text(
                  'Kế hoạch ${money(b.limitAt(month))} · Thực tế ${money(budgetSpent(data, b, month))}',
                ),
              ),
            if (closed != null)
              Surface(
                child: Text(
                  'Đã chốt ${shortDate(closed.closedAt)}\n${closed.note}',
                ),
              )
            else ...[
              CheckboxListTile(
                title: const Text(
                  'Đã kiểm tra phân loại, giao dịch nghi trùng và đối soát ví',
                ),
                value: checked,
                onChanged: (v) => setState(() => checked = v!),
              ),
              SwitchListTile(
                title: const Text('Chuyển phần hạn mức còn dư sang tháng sau'),
                value: rollover,
                onChanged: (v) => setState(() => rollover = v),
              ),
              TextField(
                controller: note,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú tổng kết',
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: busy || !checked
                    ? null
                    : () => save(
                        () => widget.controller.update(
                          (d) => widget.controller.actions.closeMonth(
                            d,
                            month,
                            note.text.trim(),
                            rollover,
                          ),
                        ),
                      ),
                child: const Text('Chốt kỳ đã kết thúc'),
              ),
              const Text(
                'Kỳ đã chốt được giữ cố định và không thể sửa giao dịch. Bạn vẫn có thể xem báo cáo và xuất CSV.',
                style: TextStyle(fontSize: 12),
              ),
            ],
            const SectionTitle('Ngưỡng cảnh báo'),
            for (final b in data.budgets)
              ListTile(
                title: Text(b.category),
                subtitle: Text('Nhắc khi đã dùng ${b.alertPercent}%'),
                trailing: PopupMenuButton<int>(
                  onSelected: (value) => save(
                    () => widget.controller.update(
                      (d) => d.copyWith(
                        budgets: d.budgets
                            .map(
                              (x) => x.id == b.id
                                  ? Budget(
                                      id: x.id,
                                      category: x.category,
                                      limit: x.limit,
                                      monthLimits: x.monthLimits,
                                      alertPercent: value,
                                    )
                                  : x,
                            )
                            .toList(),
                      ),
                    ),
                  ),
                  itemBuilder: (_) => [
                    for (final value in [50, 80, 90, 100])
                      PopupMenuItem(value: value, child: Text('$value%')),
                  ],
                ),
              ),
          ],
        );
      },
    ),
  );
}
