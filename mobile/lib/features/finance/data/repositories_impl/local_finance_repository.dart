import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/repositories/finance_repository.dart';

class LocalFinanceRepository implements FinanceRepository {
  LocalFinanceRepository(this.preferences);
  final SharedPreferencesAsync preferences;
  static const storageKey = 'picket.finance.v1';
  @override
  Future<FinanceData> load() async {
    final raw = await preferences.getString(storageKey);
    return raw == null
        ? const FinanceData()
        : FinanceData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  @override
  Future<void> save(FinanceData data) =>
      preferences.setString(storageKey, jsonEncode(data.toJson()));
}
