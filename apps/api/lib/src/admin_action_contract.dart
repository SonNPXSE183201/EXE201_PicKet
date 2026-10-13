enum AdminUserAction { suspend, restore, resetPassword, grantPlan }

class AdminUserActionRequest {
  const AdminUserActionRequest({
    required this.action,
    required this.confirmation,
    this.tier,
  });

  factory AdminUserActionRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.toSet().difference({
      'action',
      'confirmation',
      'tier',
    }).isNotEmpty) {
      throw const FormatException('Invalid admin action.');
    }
    final action = switch (json['action']) {
      'suspend' => AdminUserAction.suspend,
      'restore' => AdminUserAction.restore,
      'reset_password' => AdminUserAction.resetPassword,
      'grant_plan' => AdminUserAction.grantPlan,
      _ => throw const FormatException('Invalid admin action.'),
    };
    final confirmation = json['confirmation'];
    final requiredConfirmation = switch (action) {
      AdminUserAction.suspend => 'SUSPEND',
      AdminUserAction.restore => 'RESTORE',
      AdminUserAction.resetPassword => 'RESET',
      AdminUserAction.grantPlan => 'GRANT',
    };
    final tier = json['tier'];
    if (confirmation != requiredConfirmation ||
        (action == AdminUserAction.grantPlan
            ? !{'free', 'plus', 'pro'}.contains(tier)
            : tier != null)) {
      throw const FormatException('Admin action confirmation is required.');
    }
    return AdminUserActionRequest(
      action: action,
      confirmation: confirmation as String,
      tier: tier as String?,
    );
  }

  final AdminUserAction action;
  final String confirmation;
  final String? tier;

  Map<String, dynamic> toFunctionJson(String targetUser) => {
    'targetUser': targetUser,
    'action': switch (action) {
      AdminUserAction.suspend => 'suspend',
      AdminUserAction.restore => 'restore',
      AdminUserAction.resetPassword => 'reset_password',
      AdminUserAction.grantPlan => 'grant_plan',
    },
    'confirmation': confirmation,
    if (tier != null) 'tier': tier,
  };
}
