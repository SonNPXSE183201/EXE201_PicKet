import 'dart:io';

import 'package:picket_api/src/supabase_gateway.dart';

class AdminUserResource {
  const AdminUserResource({
    required this.id,
    required this.email,
    required this.createdAt,
    required this.bannedUntil,
    required this.revision,
    required this.entryCount,
  });

  factory AdminUserResource.fromDatabase(Object? value) {
    final json = _map(value);
    final id = json['id'];
    final email = json['email'];
    final createdAt = json['created_at'];
    final bannedUntil = json['banned_until'];
    final revision = json['revision'];
    final entryCount = json['entry_count'];
    if (id is! String ||
        email is! String ||
        createdAt is! String ||
        DateTime.tryParse(createdAt) == null ||
        (bannedUntil != null &&
            (bannedUntil is! String ||
                DateTime.tryParse(bannedUntil) == null)) ||
        (revision != null && revision is! int) ||
        entryCount is! int ||
        entryCount < 0) {
      throw _invalid();
    }
    return AdminUserResource(
      id: id,
      email: email,
      createdAt: createdAt,
      bannedUntil: bannedUntil as String?,
      revision: revision as int?,
      entryCount: entryCount,
    );
  }

  final String id;
  final String email;
  final String createdAt;
  final String? bannedUntil;
  final int? revision;
  final int entryCount;

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'createdAt': createdAt,
    'bannedUntil': bannedUntil,
    'revision': revision,
    'entryCount': entryCount,
  };
}

class AdminAuditResource {
  const AdminAuditResource({
    required this.action,
    required this.target,
    required this.createdAt,
  });

  factory AdminAuditResource.fromDatabase(Object? value) {
    final json = _map(value);
    final action = json['action'];
    final target = json['target'];
    final createdAt = json['created_at'];
    if (action is! String ||
        (target != null && target is! String) ||
        createdAt is! String ||
        DateTime.tryParse(createdAt) == null) {
      throw _invalid();
    }
    return AdminAuditResource(
      action: action,
      target: target as String?,
      createdAt: createdAt,
    );
  }

  final String action;
  final String? target;
  final String createdAt;

  Map<String, dynamic> toJson() => {
    'action': action,
    'target': target,
    'createdAt': createdAt,
  };
}

class AdminOverviewResource {
  const AdminOverviewResource({
    required this.totalUsers,
    required this.totalLedgers,
    required this.users,
    required this.audit,
    required this.maintenance,
    required this.notice,
  });

  factory AdminOverviewResource.fromDatabase(Object? value) {
    final json = _map(value);
    final totalUsers = json['total_users'];
    final totalLedgers = json['total_ledgers'];
    final users = json['users'];
    final audit = json['audit'];
    final settings = _map(json['settings']);
    if (totalUsers is! int ||
        totalLedgers is! int ||
        totalUsers < 0 ||
        totalLedgers < 0 ||
        users is! List ||
        users.length > 25 ||
        audit is! List ||
        audit.length > 50 ||
        settings['maintenance'] is! bool ||
        settings['notice'] is! String) {
      throw _invalid();
    }
    return AdminOverviewResource(
      totalUsers: totalUsers,
      totalLedgers: totalLedgers,
      users: users.map(AdminUserResource.fromDatabase).toList(),
      audit: audit.map(AdminAuditResource.fromDatabase).toList(),
      maintenance: settings['maintenance'] as bool,
      notice: settings['notice'] as String,
    );
  }

  final int totalUsers;
  final int totalLedgers;
  final List<AdminUserResource> users;
  final List<AdminAuditResource> audit;
  final bool maintenance;
  final String notice;

  Map<String, dynamic> toJson() => {
    'totalUsers': totalUsers,
    'totalLedgers': totalLedgers,
    'users': users.map((item) => item.toJson()).toList(),
    'audit': audit.map((item) => item.toJson()).toList(),
    'settings': {'maintenance': maintenance, 'notice': notice},
  };
}

Map<String, dynamic> _map(Object? value) {
  if (value is! Map) throw _invalid();
  return Map<String, dynamic>.from(value);
}

GatewayException _invalid() => const GatewayException(
  HttpStatus.badGateway,
  'Supabase returned invalid admin data.',
);
