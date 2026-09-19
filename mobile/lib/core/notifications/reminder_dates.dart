import '../../features/finance/domain/entities/finance_data.dart';

List<DateTime> reminderDates(FinanceData data, DateTime now) {
  final dates = <DateTime>[];
  for (final bill in data.bills.where((bill) => bill.paidEntryId == null)) {
    dates.add(bill.dueDate.subtract(const Duration(days: 1)));
  }
  for (final subscription in data.subscriptions.where((plan) => plan.active)) {
    dates.add(
      subscription.nextDate.subtract(Duration(days: subscription.alertDays)),
    );
  }
  for (final item in data.keepsakes) {
    if (item.returnUntil != null) {
      dates.add(item.returnUntil!.subtract(const Duration(days: 1)));
    }
    if (item.warrantyUntil != null) {
      dates.add(item.warrantyUntil!.subtract(const Duration(days: 7)));
    }
  }
  final hour = (data.preferences['reminderHour'] as int? ?? 9).clamp(0, 23);
  final future =
      dates
          .map((date) => DateTime(date.year, date.month, date.day, hour))
          .where((date) => date.isAfter(now))
          .toSet()
          .toList()
        ..sort();
  return future.take(50).toList();
}
