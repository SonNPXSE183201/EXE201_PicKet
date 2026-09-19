class EntryPart {
  const EntryPart({
    required this.category,
    required this.amount,
    this.label = '',
  });
  final String category, label;
  final int amount;
  Map<String, dynamic> toJson() => {
    'category': category,
    'amount': amount,
    'label': label,
  };
  factory EntryPart.fromJson(Map<String, dynamic> j) => EntryPart(
    category: j['category'] as String,
    amount: j['amount'] as int,
    label: j['label'] as String? ?? '',
  );
}

class SubscriptionPlan {
  const SubscriptionPlan({
    required this.id,
    required this.name,
    required this.amount,
    required this.nextDate,
    this.cycleMonths = 1,
    this.active = true,
    this.note = '',
    this.alertDays = 3,
  });
  final String id, name, note;
  final int amount, cycleMonths, alertDays;
  final DateTime nextDate;
  final bool active;
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'amount': amount,
    'nextDate': nextDate.toIso8601String(),
    'cycleMonths': cycleMonths,
    'active': active,
    'note': note,
    'alertDays': alertDays,
  };
  factory SubscriptionPlan.fromJson(Map<String, dynamic> j) => SubscriptionPlan(
    id: j['id'] as String,
    name: j['name'] as String,
    amount: j['amount'] as int,
    nextDate: DateTime.parse(j['nextDate'] as String),
    cycleMonths: j['cycleMonths'] as int,
    active: j['active'] as bool,
    note: j['note'] as String,
    alertDays: j['alertDays'] as int? ?? 3,
  );
}

class MonthClose {
  const MonthClose({
    required this.month,
    required this.income,
    required this.expense,
    required this.note,
    required this.closedAt,
  });
  final String month, note;
  final int income, expense;
  final DateTime closedAt;
  Map<String, dynamic> toJson() => {
    'month': month,
    'income': income,
    'expense': expense,
    'note': note,
    'closedAt': closedAt.toIso8601String(),
  };
  factory MonthClose.fromJson(Map<String, dynamic> j) => MonthClose(
    month: j['month'] as String,
    income: j['income'] as int,
    expense: j['expense'] as int,
    note: j['note'] as String,
    closedAt: DateTime.parse(j['closedAt'] as String),
  );
}
