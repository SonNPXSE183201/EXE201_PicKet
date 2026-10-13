import 'package:picket_api/src/finance_contract.dart';

class FinanceExportEnvelope {
  const FinanceExportEnvelope({
    required this.exportedAt,
    required this.revision,
    required this.data,
  });

  factory FinanceExportEnvelope.fromSnapshot(
    FinanceSnapshotEnvelope snapshot, {
    DateTime? exportedAt,
  }) {
    final payload = snapshot.payload;
    if (payload == null) {
      throw const FormatException('No finance data is available to export.');
    }
    return FinanceExportEnvelope(
      exportedAt: (exportedAt ?? DateTime.now()).toUtc(),
      revision: snapshot.revision,
      data: payload,
    );
  }

  final DateTime exportedAt;
  final int revision;
  final Map<String, dynamic> data;

  Map<String, dynamic> toJson() => {
    'format': 'picket-export-v1',
    'schemaVersion': 1,
    'exportedAt': exportedAt.toIso8601String(),
    'revision': revision,
    'data': data,
  };
}
