class SaveSnapshotRequest {
  const SaveSnapshotRequest({
    required this.expectedRevision,
    required this.payload,
  });

  factory SaveSnapshotRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Expected a JSON object.');
    final json = Map<String, dynamic>.from(value);
    final revision = json['expectedRevision'];
    final payload = json['payload'];
    if (revision is! int || revision < 0) {
      throw const FormatException('expectedRevision must be non-negative.');
    }
    if (payload is! Map) {
      throw const FormatException('payload must be a JSON object.');
    }
    return SaveSnapshotRequest(
      expectedRevision: revision,
      payload: Map<String, dynamic>.from(payload),
    );
  }

  final int expectedRevision;
  final Map<String, dynamic> payload;
}

class FinanceSnapshotEnvelope {
  const FinanceSnapshotEnvelope({
    required this.revision,
    required this.payload,
    this.updatedAt,
  });

  final int revision;
  final Map<String, dynamic>? payload;
  final DateTime? updatedAt;

  Map<String, dynamic> toJson() => {
    'revision': revision,
    'payload': payload,
    'updatedAt': updatedAt?.toUtc().toIso8601String(),
  };
}
