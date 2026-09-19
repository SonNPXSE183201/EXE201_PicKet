import '../entities/finance_data.dart';

abstract interface class FinanceRepository {
  Future<FinanceData> load();
  Future<void> save(FinanceData data);
}
