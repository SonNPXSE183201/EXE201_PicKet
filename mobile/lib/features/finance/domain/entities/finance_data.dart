import 'planning_entities.dart';
export 'planning_entities.dart';

class Wallet {
  const Wallet({
    required this.id,
    required this.name,
    required this.openingBalance,
  });
  final String id;
  final String name;
  final int openingBalance;
  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'openingBalance': openingBalance,
  };
  factory Wallet.fromJson(Map<String, dynamic> j) => Wallet(
    id: j['id'] as String,
    name: j['name'] as String,
    openingBalance: j['openingBalance'] as int,
  );
}

enum EntryType { expense, income, transfer }

class Entry {
  const Entry({
    required this.id,
    required this.title,
    required this.amount,
    required this.type,
    required this.walletId,
    required this.category,
    required this.date,
    this.refundOf,
    this.parts = const [],
    this.reconciled = false,
    this.reconciledWalletIds = const [],
    this.destinationId,
    this.note = '',
    this.receiptPath,
  });
  final String id, title, walletId, category, note;
  final int amount;
  final EntryType type;
  final DateTime date;
  final String? destinationId, receiptPath;
  final String? refundOf;
  final List<EntryPart> parts;
  final bool reconciled;
  final List<String> reconciledWalletIds;
  List<String> get clearedWalletIds => reconciledWalletIds.isNotEmpty
      ? reconciledWalletIds
      : reconciled
      ? [
          walletId,
          if (type == EntryType.transfer && destinationId != null)
            destinationId!,
        ]
      : const [];
  bool isReconciledFor(String id) => clearedWalletIds.contains(id);
  Entry copyWith({
    String? title,
    String? category,
    String? note,
    bool? reconciled,
    List<String>? reconciledWalletIds,
    List<EntryPart>? parts,
  }) => Entry(
    id: id,
    title: title ?? this.title,
    amount: amount,
    type: type,
    walletId: walletId,
    category: category ?? this.category,
    date: date,
    destinationId: destinationId,
    note: note ?? this.note,
    receiptPath: receiptPath,
    refundOf: refundOf,
    parts: parts ?? this.parts,
    reconciled: reconciled ?? this.reconciled,
    reconciledWalletIds: reconciledWalletIds ?? this.reconciledWalletIds,
  );
  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'amount': amount,
    'type': type.name,
    'walletId': walletId,
    'category': category,
    'date': date.toIso8601String(),
    'destinationId': destinationId,
    'note': note,
    'receiptPath': receiptPath,
    'refundOf': refundOf,
    'parts': parts.map((p) => p.toJson()).toList(),
    'reconciled': reconciled,
    'reconciledWalletIds': reconciledWalletIds,
  };
  factory Entry.fromJson(Map<String, dynamic> j) => Entry(
    id: j['id'] as String,
    title: j['title'] as String,
    amount: j['amount'] as int,
    type: EntryType.values.byName(j['type'] as String),
    walletId: j['walletId'] as String,
    category: j['category'] as String,
    date: DateTime.parse(j['date'] as String),
    destinationId: j['destinationId'] as String?,
    note: j['note'] as String? ?? '',
    receiptPath: j['receiptPath'] as String?,
    refundOf: j['refundOf'] as String?,
    parts: (j['parts'] as List? ?? [])
        .map((p) => EntryPart.fromJson(Map<String, dynamic>.from(p as Map)))
        .toList(),
    reconciled: j['reconciled'] as bool? ?? false,
    reconciledWalletIds: (j['reconciledWalletIds'] as List? ?? const [])
        .cast<String>(),
  );
}

class Budget {
  const Budget({
    required this.id,
    required this.category,
    required this.limit,
    this.alertPercent = 80,
    this.monthLimits = const {},
  });
  final int alertPercent;
  final Map<String, int> monthLimits;
  int limitAt(DateTime date) =>
      monthLimits['${date.year}-${date.month}'] ?? limit;
  final String id, category;
  final int limit;
  Map<String, dynamic> toJson() => {
    'id': id,
    'category': category,
    'limit': limit,
    'alertPercent': alertPercent,
    'monthLimits': monthLimits,
  };
  factory Budget.fromJson(Map<String, dynamic> j) => Budget(
    id: j['id'] as String,
    category: j['category'] as String,
    limit: j['limit'] as int,
    alertPercent: j['alertPercent'] as int? ?? 80,
    monthLimits: (j['monthLimits'] as Map? ?? {}).map(
      (k, v) => MapEntry(k as String, v as int),
    ),
  );
}

class Bill {
  const Bill({
    required this.id,
    required this.title,
    required this.amount,
    required this.dueDate,
    this.paidEntryId,
  });
  final String id, title;
  final int amount;
  final DateTime dueDate;
  final String? paidEntryId;
  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'amount': amount,
    'dueDate': dueDate.toIso8601String(),
    'paidEntryId': paidEntryId,
  };
  factory Bill.fromJson(Map<String, dynamic> j) => Bill(
    id: j['id'] as String,
    title: j['title'] as String,
    amount: j['amount'] as int,
    dueDate: DateTime.parse(j['dueDate'] as String),
    paidEntryId: j['paidEntryId'] as String?,
  );
}

class Keepsake {
  const Keepsake({
    required this.id,
    required this.title,
    required this.amount,
    required this.date,
    this.note = '',
    this.photoPath,
    this.category = 'Khác',
    this.warrantyUntil,
    this.returnUntil,
  });
  final String id, title, note;
  final int amount;
  final DateTime date;
  final String? photoPath;
  final String category;
  final DateTime? warrantyUntil, returnUntil;
  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'amount': amount,
    'date': date.toIso8601String(),
    'note': note,
    'photoPath': photoPath,
    'category': category,
    'warrantyUntil': warrantyUntil?.toIso8601String(),
    'returnUntil': returnUntil?.toIso8601String(),
  };
  factory Keepsake.fromJson(Map<String, dynamic> j) => Keepsake(
    id: j['id'] as String,
    title: j['title'] as String,
    amount: j['amount'] as int,
    date: DateTime.parse(j['date'] as String),
    note: j['note'] as String? ?? '',
    photoPath: j['photoPath'] as String?,
    category: j['category'] as String? ?? 'Khác',
    warrantyUntil: j['warrantyUntil'] == null
        ? null
        : DateTime.parse(j['warrantyUntil'] as String),
    returnUntil: j['returnUntil'] == null
        ? null
        : DateTime.parse(j['returnUntil'] as String),
  );
}

class FinanceData {
  const FinanceData({
    this.name = '',
    this.onboarded = false,
    this.hideBalance = false,
    this.wallets = const [],
    this.entries = const [],
    this.budgets = const [],
    this.bills = const [],
    this.keepsakes = const [],
    this.subscriptions = const [],
    this.closedMonths = const [],
    this.customCategories = const [],
    this.preferences = const {},
  });
  final String name;
  final bool onboarded, hideBalance;
  final List<Wallet> wallets;
  final List<Entry> entries;
  final List<Budget> budgets;
  final List<Bill> bills;
  final List<Keepsake> keepsakes;
  final List<SubscriptionPlan> subscriptions;
  final List<MonthClose> closedMonths;
  final List<String> customCategories;
  final Map<String, dynamic> preferences;
  FinanceData copyWith({
    String? name,
    bool? onboarded,
    bool? hideBalance,
    List<Wallet>? wallets,
    List<Entry>? entries,
    List<Budget>? budgets,
    List<Bill>? bills,
    List<Keepsake>? keepsakes,
    List<SubscriptionPlan>? subscriptions,
    List<MonthClose>? closedMonths,
    List<String>? customCategories,
    Map<String, dynamic>? preferences,
  }) => FinanceData(
    name: name ?? this.name,
    onboarded: onboarded ?? this.onboarded,
    hideBalance: hideBalance ?? this.hideBalance,
    wallets: wallets ?? this.wallets,
    entries: entries ?? this.entries,
    budgets: budgets ?? this.budgets,
    bills: bills ?? this.bills,
    keepsakes: keepsakes ?? this.keepsakes,
    subscriptions: subscriptions ?? this.subscriptions,
    closedMonths: closedMonths ?? this.closedMonths,
    customCategories: customCategories ?? this.customCategories,
    preferences: preferences ?? this.preferences,
  );
  Map<String, dynamic> toJson() => {
    'version': 2,
    'name': name,
    'onboarded': onboarded,
    'hideBalance': hideBalance,
    'wallets': wallets.map((e) => e.toJson()).toList(),
    'entries': entries.map((e) => e.toJson()).toList(),
    'budgets': budgets.map((e) => e.toJson()).toList(),
    'bills': bills.map((e) => e.toJson()).toList(),
    'keepsakes': keepsakes.map((e) => e.toJson()).toList(),
    'subscriptions': subscriptions.map((s) => s.toJson()).toList(),
    'closedMonths': closedMonths.map((m) => m.toJson()).toList(),
    'customCategories': customCategories,
    'preferences': preferences,
  };
  factory FinanceData.fromJson(Map<String, dynamic> j) {
    if (j['version'] != 1 && j['version'] != 2) {
      throw const FormatException('Unsupported data version');
    }
    List<T> read<T>(String key, T Function(Map<String, dynamic>) parse) =>
        (j[key] as List? ?? [])
            .map((e) => parse(Map<String, dynamic>.from(e as Map)))
            .toList();
    return FinanceData(
      name: j['name'] as String,
      onboarded: j['onboarded'] as bool,
      hideBalance: j['hideBalance'] as bool,
      wallets: read('wallets', Wallet.fromJson),
      entries: read('entries', Entry.fromJson),
      budgets: read('budgets', Budget.fromJson),
      bills: read('bills', Bill.fromJson),
      keepsakes: read('keepsakes', Keepsake.fromJson),
      subscriptions: read('subscriptions', SubscriptionPlan.fromJson),
      closedMonths: read('closedMonths', MonthClose.fromJson),
      customCategories: (j['customCategories'] as List? ?? []).cast<String>(),
      preferences: Map<String, dynamic>.from(j['preferences'] as Map? ?? {}),
    );
  }
}
