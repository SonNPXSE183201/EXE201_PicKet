import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/picket_widgets.dart';
import '../../finance/domain/usecases/finance_actions.dart';
import '../../finance/presentation/state/finance_controller.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Thông báo')),
    body: ListenableBuilder(
      listenable: controller,
      builder: (context, _) {
        final data = controller.data, now = DateTime.now();
        final notices = <(String, String)>[];
        for (final bill in data.bills.where(
          (b) => b.paidEntryId == null && b.dueDate.difference(now).inDays <= 7,
        )) {
          notices.add((
            'bill:${bill.id}',
            '${bill.title} · hạn ${shortDate(bill.dueDate)}',
          ));
        }
        for (final subscription in data.subscriptions.where(
          (s) => s.active && s.nextDate.difference(now).inDays <= s.alertDays,
        )) {
          notices.add((
            'sub:${subscription.id}:${subscription.nextDate.toIso8601String()}',
            '${subscription.name} sắp đến kỳ thanh toán',
          ));
        }
        for (final budget in data.budgets) {
          final spent = budgetSpent(data, budget, now);
          if (spent >= budget.limitAt(now) * budget.alertPercent / 100) {
            notices.add((
              'budget:${budget.id}:${monthKey(now)}',
              '${budget.category} đã dùng ${money(spent)} / ${money(budget.limitAt(now))}',
            ));
          }
        }
        for (final item in data.keepsakes) {
          if (item.returnUntil != null &&
              item.returnUntil!.difference(now).inDays <= 3 &&
              item.returnUntil!.isAfter(now)) {
            notices.add((
              'return:${item.id}',
              '${item.title} sắp hết hạn đổi trả',
            ));
          }
        }
        final read = (data.preferences['readNotifications'] as List? ?? [])
            .cast<String>();
        return ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (notices.isEmpty)
              const EmptyState(
                title: 'Chưa có thông báo mới',
                description:
                    'Picket sẽ nhắc khi có hạn thanh toán hoặc ngân sách cần chú ý.',
              ),
            for (final notice in notices)
              ListTile(
                leading: Icon(
                  read.contains(notice.$1)
                      ? Icons.notifications_none
                      : Icons.notifications_active_outlined,
                ),
                title: Text(notice.$2),
                subtitle: Text(
                  read.contains(notice.$1)
                      ? 'Đã đọc'
                      : 'Chạm để đánh dấu đã đọc',
                ),
                onTap: () => performSave(
                  context,
                  () => controller.update(
                    (d) => d.copyWith(
                      preferences: {
                        ...d.preferences,
                        'readNotifications': {...read, notice.$1}.toList(),
                      },
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    ),
  );
}
